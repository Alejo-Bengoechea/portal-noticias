import { randomUUID } from 'node:crypto';
import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { MAIN, branch, exigir, ref, repo, samePath } from './coord/git.mjs';
import { confirm, prepare } from './coord/integracion.mjs';
import { allTasks, claims, location, open, reconcile, transaction } from './coord/registro.mjs';
import { deliver, getTask, grant, known, release, requests, reserveTask, validateTask } from './coord/reservas.mjs';

const help = `Coordinación local • node scripts/coord.mjs <comando> [opciones]

  estado [--recuperar --confirmar]
  iniciar --agente codex|claude --tarea ID --archivo RUTA [--carpeta RUTA]
  adoptar --agente codex|claude --tarea ID --archivo RUTA [--base SHA]
  adoptar --agente codex --tarea tarea-0
  adoptar --agente claude-nube --tarea ID --rama claude/… --base SHA --archivo RUTA
  ampliar --archivo RUTA [--carpeta RUTA]
  validar
  entregar --nota TEXTO --pruebas TEXTO [--depende ID]
  integrar preparar --agente codex --tarea ID --confirmar
  integrar confirmar --agente codex --tarea ID --sha SHA --confirmar
  liberar

--archivo, --carpeta y --depende se pueden repetir.
--tarea selecciona una tarea de la nube desde main; --json devuelve datos estructurados.
--confirmar se usa solo con autorización expresa del usuario.
`;

const options = Object.fromEntries([
  ...['tarea', 'agente', 'base', 'rama', 'nota', 'pruebas', 'sha'].map(key => [key, { type: 'string' }]),
  ...['archivo', 'carpeta', 'depende'].map(key => [key, { type: 'string', multiple: true, default: [] }]),
  ...['json', 'help', 'confirmar', 'recuperar'].map(key => [key, { type: 'boolean' }]),
]);

function state(db, repo, flags) {
  const rows = allTasks(db);
  const tasks = rows.filter(row => !flags.tarea || row.id === flags.tarea).map(row => ({
    id: row.id, agente: row.agent, estado: row.status, ruta: row.root, rama: row.branch, base: row.base,
    reservas: claims(db, row.id).map(entry => entry.name + (entry.kind === 'dir' ? '/' : '')),
    respaldo: row.backup, entrega: row.delivery, dependencias: JSON.parse(row.dependencies),
    nota: row.note, pruebas: row.tests,
  }));
  exigir(!flags.tarea || tasks.length, 'No existe la tarea ' + flags.tarea + '.');
  const integration = db.prepare('SELECT task AS tarea,base,candidate AS candidato,ready AS probado FROM integration').get();
  return { tareas: tasks, integracion: integration, reservasDesconocidas: rows.some(row => row.status === 'desconocida') };
}

function display(command, result, json) {
  if (json) {
    process.stdout.write(JSON.stringify(result) + '\n');
    return;
  }
  if (command === 'estado') {
    for (const row of result.tareas) {
      console.log([row.id, row.agente, row.estado, row.reservas.join(', ')].filter(Boolean).join(' · '));
      if (row.entrega) console.log('  Entrega ' + row.entrega + (row.dependencias.length ? ' · depende de ' + row.dependencias.join(', ') : ''));
    }
    if (!result.tareas.length) console.log('Sin tareas registradas.');
    if (result.reservasDesconocidas) console.log('Hay reservas desconocidas. Redeclará su alcance antes de editar.');
    if (result.integracion) console.log('Integración · ' + result.integracion.tarea + ' · ' +
      (result.integracion.probado ? result.integracion.candidato : 'pendiente de pruebas'));
    return;
  }
  console.log([result.id, result.estado, result.root, result.candidato ?? result.sha].filter(Boolean).join(' · '));
  if (result.reservas?.length) console.log('Reservas · ' + result.reservas.join(', '));
  if (result.sinReserva?.length) console.log('Cambios en main fuera del respaldo inicial · ' + result.sinReserva.join(', '));
  if (result.ramaMovida) console.log('La rama cambió desde la entrega. El candidato usa el SHA congelado.');
}

function recoverRegistry(repo, flags) {
  exigir(flags.confirmar && flags.agente === 'codex' && samePath(repo.root, repo.main) && branch(repo.root) === 'main',
    'La recuperación requiere a Codex en main y autorización expresa. Cerrá antes las sesiones de coordinación.');
  const suffix = '.aislado-' + randomUUID();
  for (const name of ['registro.sqlite', 'registro.sqlite-wal', 'registro.sqlite-shm']) {
    const file = path.join(location(repo), name);
    if (existsSync(file)) renameSync(file, file + suffix);
  }
}

function run() {
  const { values: flags, positionals } = parseArgs({ options, allowPositionals: true });
  const [command, subcommand] = positionals;
  if (flags.help || !command || command === 'ayuda') return console.log(help);
  exigir(['estado', 'iniciar', 'adoptar', 'ampliar', 'validar', 'entregar', 'integrar', 'liberar'].includes(command) &&
    (command === 'integrar' ? ['preparar', 'confirmar'].includes(subcommand) && positionals.length === 2 : positionals.length === 1),
  'Comando desconocido. Consultá --help.');
  exigir(!flags.recuperar || command === 'estado', '--recuperar solo se admite con estado.');
  const current = repo();
  if (flags.recuperar) recoverRegistry(current, flags);
  const db = open(current);
  try {
    const result = subcommand === 'preparar' ? prepare(db, current, flags) : transaction(db, () => {
      const main = ref(current.root, MAIN + '^{commit}');
      exigir(main, 'No se encontró la rama local main.');
      reconcile(db, current, main);
      if (command === 'estado') return state(db, current, flags);
      if (command === 'iniciar' || command === 'adoptar') return reserveTask(db, current, flags, command);
      if (command === 'entregar') return deliver(db, current, flags);
      if (command === 'liberar') return release(db, current, flags);
      if (command === 'integrar') return confirm(db, current, flags);
      const row = getTask(db, current, flags, command === 'validar' ? ['activa', 'entregada'] : ['activa']);
      if (command === 'ampliar') {
        known(db, row.id);
        exigir(row.id !== 'tarea-0', 'La tarea-0 conserva el alcance del respaldo inicial.');
        grant(db, row.id, requests(current, flags));
      }
      return validateTask(db, current, row);
    });
    display(command, result, flags.json);
  } finally {
    db.close();
  }
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const hint = error?.code?.startsWith('ERR_SQLITE') ? ' Operación detenida. Si el registro está dañado, consultá la recuperación en CONTEXTO_IA.md.' : '';
  if (process.argv.includes('--json')) console.error(JSON.stringify({ error: message + hint }));
  else console.error(message + hint);
  process.exitCode = 1;
}
