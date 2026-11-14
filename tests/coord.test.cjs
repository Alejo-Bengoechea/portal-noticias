const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const source = path.resolve(__dirname, '..', 'scripts');
const cliFile = path.join(source, 'coord.mjs');
const special = 'app/(public)/categoria/[slug]/page.tsx';
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

function command(file, args, cwd, { fail, input, env = {} } = {}) {
  const result = spawnSync(file, args, { cwd, input, env: { ...gitEnv, ...env }, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, fail ? 1 : 0, [file, ...args, result.stdout, result.stderr].join(' '));
  return fail ? result.stderr : result.stdout;
}

function git(cwd, ...args) {
  return command('git', ['--no-optional-locks', '--literal-pathspecs', ...args], cwd).trim();
}

function cli(cwd, args, fail) {
  const output = command(process.execPath, [cliFile, ...args, '--json'], cwd, { fail });
  return JSON.parse(output.trim().split(/\r?\n/).at(-1));
}

function write(root, name, content = 'cambio\n') {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fixture(t) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'coord pruebas '));
  t.after(() => fs.rmSync(outer, { recursive: true, force: true, maxRetries: 5 }));
  const main = path.join(outer, 'portal');
  fs.mkdirSync(main);
  git(main, 'init', '-b', 'main');
  git(main, 'config', 'user.email', 'coord@example.test');
  git(main, 'config', 'user.name', 'Pruebas');
  git(main, 'config', 'core.autocrlf', 'true');
  git(main, 'config', 'core.ignorecase', 'true');
  fs.cpSync(source, path.join(main, 'scripts'), { recursive: true });
  write(main, 'AGENTS.md', '# Reglas\n');
  write(main, 'CLAUDE.md', '@AGENTS.md\n');
  write(main, '.gitignore', 'node_modules/\n.env*\n');
  write(main, 'MEMORIA_IA.md', '# Memoria\n\n## Sincronización\n\n- Última actualización: 2026-11-14 · Codex\n' +
    '- Commit base: temporal\n- Árbol al cerrar: limpio.\n\n## En curso\n\n- Nada en curso.\n\n## Registro\n\n' +
    Array.from({ length: 8 }, (_, i) => '- 2026-11-14 · ' + (i % 2 ? 'Codex' : 'Claude Code') + ' · Entrada ' + i).join('\n') + '\n');
  write(main, 'package.json', '{"name":"fixture","version":"1.0.0","scripts":{"test":"node -e \\"0\\"","check":"node -e \\"0\\"","build":"node -e \\"0\\""}}\n');
  write(main, 'package-lock.json', '{"name":"fixture","version":"1.0.0","lockfileVersion":3,"packages":{"":{"name":"fixture","version":"1.0.0"}}}\n');
  for (const name of ['app/(public)/page.tsx', special, 'a.txt', 'b.txt', 'c.txt']) write(main, name, 'original\n');
  for (let n = 0; n < 14; n++) write(main, 'portada/' + n + '.txt', 'original\n');
  git(main, 'add', '--all');
  git(main, 'commit', '-m', 'Base de prueba');
  const base = git(main, 'rev-parse', 'HEAD');
  return { outer, main, base, registry: path.join(main, '.git', 'coord', 'registro.sqlite') };
}

function start(main, id, files, agent = 'codex') {
  return cli(main, ['iniciar', '--agente', agent, '--tarea', id, ...files.flatMap(file => ['--archivo', file])]).root;
}

function changeAndDeliver(root, file, ...extra) {
  write(root, file);
  git(root, 'add', '--', file);
  git(root, 'commit', '-m', 'Cambio de prueba');
  return cli(root, ['entregar', '--nota', 'Actualiza ' + file, '--pruebas', 'Verificado', ...extra]);
}

const snapshot = (root, fail) => cli(root, ['estado'], fail);
const prepare = (main, id, fail) => cli(main, ['integrar', 'preparar', '--agente', 'codex', '--tarea', id, '--confirmar'], fail);
const confirm = (main, id, sha, fail) =>
  cli(main, ['integrar', 'confirmar', '--agente', 'codex', '--tarea', id, '--sha', sha, '--confirmar'], fail);

test('T1: doce procesos compiten por el mismo grupo; archivo y carpeta también se excluyen', async t => {
  const { main } = fixture(t);
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => new Promise((resolve, reject) => {
    const processArgs = [cliFile, 'iniciar', '--agente', 'codex', '--tarea', 'colision-' + i,
      '--archivo', 'a.txt', '--carpeta', 'app/(public)', '--json'];
    const child = spawn(process.execPath, processArgs, { cwd: main, windowsHide: true });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk; });
    child.stdout.resume();
    child.on('error', reject);
    child.on('close', code => resolve({ code, error }));
  })));
  assert.equal(results.filter(row => row.code === 0).length, 1, JSON.stringify(results));
  assert.ok(results.filter(row => row.code !== 0).every(row => /cruza la reserva/.test(row.error)), JSON.stringify(results));
  const [{ reservas }] = snapshot(main).tareas;
  assert.deepEqual(reservas, ['a.txt', 'app/(public)/']);
  assert.equal(snapshot(main).tareas.length, 1);
  assert.match(cli(main, ['iniciar', '--agente', 'claude', '--tarea', 'otra', '--archivo', special], true).error, /cruza la reserva/);
});

test('T2: una sesión liberada no valida ni entrega, y sus cambios quedan en el worktree', t => {
  const { main, registry } = fixture(t);
  const root = start(main, 'antes', ['a.txt']);
  cli(root, ['liberar']);
  start(main, 'despues', ['a.txt'], 'claude');
  write(root, 'a.txt', 'preservar\n');
  assert.match(cli(root, ['validar'], true).error, /perdió.*a\.txt/);
  assert.match(cli(root, ['entregar', '--nota', 'Intento', '--pruebas', 'Ninguna'], true).error, /perdió.*a\.txt/);
  assert.equal(fs.readFileSync(path.join(root, 'a.txt'), 'utf8'), 'preservar\n');
  fs.unlinkSync(registry);
  assert.equal(snapshot(main).tareas.find(row => row.id === 'antes').estado, 'liberada');
  assert.match(cli(root, ['validar'], true).error, /perdió.*a\.txt/);
});

test('T3: rutas equivalentes, espacios y corchetes se aceptan literalmente; escapes se rechazan', t => {
  const { main, outer } = fixture(t);
  const root = start(main, 'rutas', ['App\\(Public)\\Page.tsx', './app/(public)/page.tsx', special]);
  const absolute = path.join(root, 'app', '(public)', 'page.tsx');
  cli(root, ['ampliar', '--archivo', absolute.replace(/^[a-z]/i, letter => letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase())]);
  cli(path.join(root, 'app', '(public)'), ['ampliar', '--archivo', './page.tsx']);
  assert.deepEqual(snapshot(root).tareas[0].reservas, [special, 'app/(public)/page.tsx']);
  for (const file of ['../a.txt', path.join(outer, 'salir.txt'), 'ARCHIV~1.txt', 'app/nombre. ', '\\\\?\\C:\\test']) {
    assert.match(cli(root, ['ampliar', '--archivo', file], true).error, /Ruta|ruta/);
  }
});

test('T4: valida y rechaza modificaciones, archivos nuevos, renombres y archivos de integrador', t => {
  const { main } = fixture(t);
  const root = start(main, 'alcance', ['a.txt']);
  git(root, 'mv', '--', 'a.txt', 'movido.txt');
  write(root, 'b.txt');
  write(root, 'nuevo.txt');
  write(root, 'MEMORIA_IA.md');
  for (const cmd of [['validar'], ['entregar', '--nota', 'Intento', '--pruebas', 'No']]) {
    const { error } = cli(root, cmd, true);
    assert.match(error, /fuera de reserva/);
    for (const file of ['movido.txt', 'b.txt', 'nuevo.txt', 'MEMORIA_IA.md']) assert.ok(error.includes(file));
  }
  git(root, 'add', '--all');
  git(root, 'commit', '-m', 'Fuera de alcance');
  assert.match(cli(root, ['entregar', '--nota', 'Intento', '--pruebas', 'No'], true).error, /movido\.txt/);
});

test('T5: lockfile y manifiesto se reservan juntos y el prefijo de migración es único', t => {
  const { main } = fixture(t);
  const reserve = (...files) => ['iniciar', '--agente', 'claude', '--tarea', 'dos', ...files.flatMap(file => ['--archivo', file])];
  assert.match(cli(main, reserve('package.json'), true).error, /juntos/);
  start(main, 'uno', ['package.json', 'package-lock.json', 'supabase/migrations/202611140001_a.sql']);
  assert.match(cli(main, reserve('package.json', 'package-lock.json'), true).error, /cruza la reserva/);
  assert.match(cli(main, reserve('supabase/migrations/202611140001_b.sql'), true).error, /cruza la reserva/);
  assert.match(cli(main, ['iniciar', '--agente', 'claude', '--tarea', 'dos', '--carpeta', 'supabase'], true).error, /nombre exacto/);
});

test('T6: respaldo de 15 rutas y adopción de main conservan el estado y el índice', t => {
  const { outer, main, base } = fixture(t);
  const added = 'supabase/migrations/202611140001_home_cover.sql';
  for (let n = 0; n < 14; n++) write(main, 'portada/' + n + '.txt');
  write(main, added);
  write(main, '.env.local', 'SOLO_PRUEBA=ignorado\n');
  const index = path.join(main, '.git', 'index');
  const bytes = fs.readFileSync(index);
  const before = git(main, 'status', '--porcelain=v2', '-z', '--untracked-files=all');
  const temporary = { env: { GIT_INDEX_FILE: path.join(outer, 'temporal-index') } };
  for (const args of [['read-tree', base], ['add', '-A']]) command('git', args, main, temporary);
  const tree = command('git', ['write-tree'], main, temporary).trim();
  const ref = 'refs/coord/respaldos/tarea-0/' + base + '/antes-de-coordinacion';
  git(main, 'update-ref', ref, tree);
  const recorded = cli(main, ['adoptar', '--tarea', 'tarea-0', '--agente', 'codex']);
  assert.equal(recorded.reservas.length, 15);
  assert.equal(recorded.respaldo, tree);
  assert.deepEqual(fs.readFileSync(index), bytes);
  assert.equal(git(main, 'status', '--porcelain=v2', '-z', '--untracked-files=all'), before);
  assert.match(cli(main, ['iniciar', '--agente', 'claude', '--tarea', 'cruce', '--archivo', added], true).error, /tarea-0/);
  assert.match(cli(main, ['liberar'], true).error, /limpio/);
});

test('T7: la entrega se congela por SHA y se puede integrar aunque avance y desaparezca su rama', t => {
  const { main } = fixture(t);
  const root = start(main, 'congelada', ['a.txt']);
  const { sha } = changeAndDeliver(root, 'a.txt');
  write(root, 'a.txt', 'posterior\n');
  git(root, 'add', '--', 'a.txt');
  git(root, 'commit', '-m', 'Posterior');
  const { candidato, ramaMovida } = prepare(main, 'congelada');
  assert.equal(ramaMovida, true);
  git(root, 'switch', '--detach', sha);
  git(main, 'update-ref', '-d', 'refs/heads/codex/congelada');
  confirm(main, 'congelada', candidato);
  assert.equal(git(main, 'show', 'HEAD:a.txt'), 'cambio');
  assert.equal(git(main, 'rev-parse', 'refs/coord/entregas/congelada'), sha);
  const memory = git(main, 'show', 'HEAD:MEMORIA_IA.md');
  assert.match(memory, /Actualiza a\.txt/);
  assert.match(memory, /Claude Code · Entrada 0/);
  assert.equal(memory.split('## Registro')[1].split('\n').filter(line => line.startsWith('- ')).length, 8);
});

test('T8: candidato preparado se reutiliza y Git reconcilia el fast-forward si cae el registro', t => {
  const { main, base, registry } = fixture(t);
  const root = start(main, 'caida', ['a.txt'], 'claude');
  changeAndDeliver(root, 'a.txt');
  const first = prepare(main, 'caida');
  assert.equal(git(main, 'rev-parse', 'HEAD'), base);
  // Simula una caída después de fijar el candidato, antes de registrar las pruebas.
  const simulate = 'const db=new (require("node:sqlite").DatabaseSync)(process.argv[1]);' +
    'db.exec("UPDATE integration SET candidate=NULL,pid=NULL,ready=0");db.close()';
  command(process.execPath, ['--disable-warning=ExperimentalWarning', '-e', simulate, registry], main);
  assert.match(confirm(main, 'caida', first.candidato, true).error, /no coincide/);
  const second = prepare(main, 'caida');
  assert.equal(first.candidato, second.candidato);
  assert.match(confirm(main, 'caida', base, true).error, /no coincide/);
  git(main, 'merge', '--ff-only', first.candidato);
  assert.equal(snapshot(main).tareas[0].estado, 'integrada');
  assert.deepEqual(snapshot(main).tareas[0].reservas, []);
  assert.equal(confirm(main, 'caida', first.candidato).estado, 'integrada');
});

test('una base movida o un worktree de integración alterado invalidan la confirmación', t => {
  const { main } = fixture(t);
  const root = start(main, 'obsoleta', ['a.txt']);
  changeAndDeliver(root, 'a.txt');
  const { candidato, base } = prepare(main, 'obsoleta');
  const integration = path.join(main + '-wt', 'integracion');
  write(integration, 'sin-registrar.txt');
  assert.match(confirm(main, 'obsoleta', candidato, true).error, /worktree de integración cambió/);
  assert.match(prepare(main, 'obsoleta', true).error, /tiene cambios/);
  assert.equal(git(main, 'rev-parse', 'HEAD'), base);
  fs.unlinkSync(path.join(integration, 'sin-registrar.txt'));
  const next = prepare(main, 'obsoleta');
  write(main, 'b.txt', 'main avanzó\n');
  git(main, 'add', '--', 'b.txt');
  git(main, 'commit', '-m', 'Cambio concurrente en main');
  assert.match(confirm(main, 'obsoleta', next.candidato, true).error, /cambió main/);
  assert.equal(git(main, 'show', 'HEAD:a.txt'), 'original');
});

test('T9: registro perdido o ilegible bloquea escrituras hasta redeclarar las reservas', t => {
  const { main, registry } = fixture(t);
  const root = start(main, 'recuperar', ['a.txt']);
  const { sha } = changeAndDeliver(root, 'a.txt');
  fs.unlinkSync(registry);
  const state = snapshot(main);
  assert.equal(state.reservasDesconocidas, true);
  assert.equal(state.tareas[0].entrega, sha);
  assert.match(cli(main, ['iniciar', '--agente', 'codex', '--tarea', 'otra', '--archivo', 'b.txt'], true).error, /desconocidas/);
  fs.writeFileSync(registry, 'dañado');
  assert.match(snapshot(main, true).error, /detenida/);
  const repaired = cli(main, ['estado', '--recuperar', '--confirmar', '--agente', 'codex']);
  assert.equal(repaired.tareas[0].estado, 'desconocida');
  cli(root, ['adoptar', '--tarea', 'recuperar', '--archivo', 'a.txt']);
  const frozen = cli(root, ['entregar', '--nota', 'Nota recuperada', '--pruebas', 'Verificado']);
  assert.equal(frozen.sha, sha);
  assert.equal(snapshot(main).reservasDesconocidas, false);
});

test('un worktree creado antes de una caída se recupera aunque todavía no tenga marca', t => {
  const { main, base } = fixture(t);
  const root = path.join(main + '-wt', 'claude-interrumpida');
  git(main, 'worktree', 'add', '-b', 'claude/interrumpida', '--', root, base);
  assert.equal(snapshot(main).tareas[0].estado, 'desconocida');
  cli(root, ['adoptar', '--tarea', 'interrumpida', '--archivo', 'a.txt']);
  assert.deepEqual(cli(root, ['validar']).reservas, ['a.txt']);
});

test('dos agentes entregan sin esperar y se integra primero la dependencia', t => {
  const { main } = fixture(t);
  const one = start(main, 'primera', ['a.txt']);
  const two = start(main, 'segunda', ['b.txt'], 'claude');
  changeAndDeliver(two, 'b.txt', '--depende', 'primera');
  assert.match(prepare(main, 'segunda', true).error, /dependencia primera/);
  changeAndDeliver(one, 'a.txt');
  assert.match(cli(main, ['integrar', 'preparar', '--agente', 'claude', '--tarea', 'primera', '--confirmar'], true).error, /Codex/);
  confirm(main, 'primera', prepare(main, 'primera').candidato);
  confirm(main, 'segunda', prepare(main, 'segunda').candidato);
  assert.equal(git(main, 'show', 'HEAD:a.txt'), 'cambio');
  assert.equal(git(main, 'show', 'HEAD:b.txt'), 'cambio');
});

test('la reserva de Claude en la nube sobrevive a la pérdida de SQLite antes de entregar', t => {
  const { main, base, registry } = fixture(t);
  const reserve = ['adoptar', '--agente', 'claude-nube', '--tarea', 'remota',
    '--base', base, '--rama', 'claude/remota', '--archivo', 'a.txt'];
  assert.match(cli(main, reserve, true).error, /publicada/);
  git(main, 'update-ref', 'refs/remotes/origin/main', base);
  cli(main, reserve);
  fs.unlinkSync(registry);
  assert.equal(snapshot(main).tareas[0].estado, 'desconocida');
  assert.match(cli(main, ['iniciar', '--agente', 'codex', '--tarea', 'local', '--archivo', 'a.txt'], true).error, /desconocidas/);
  cli(main, reserve);
  assert.match(cli(main, ['entregar', '--tarea', 'remota', '--nota', 'Cambio', '--pruebas', 'OK'], true).error, /Falta el SHA/);
});
