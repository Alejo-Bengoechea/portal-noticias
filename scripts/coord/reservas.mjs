import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { MAIN, ancestor, branch, diff, dirty, exigir, git, head, idle, immutableRef, isEnvironment, isSha, ref, ruta, samePath, safeTreePaths, tree, worktrees } from './git.mjs';
import { allTasks, claims, closeTask, cloudMarker, deliveryRef, idPattern, insert, jsonFile, marker, putMarker, task } from './registro.mjs';

const exclusive = [
  'memoria_ia.md', 'contexto_ia.md', 'agents.md', 'claude.md', '.gitignore',
  '.claude/settings.json', 'scripts/coord.mjs', 'scripts/coord', 'tests/coord.test.cjs',
];
const overlaps = (a, b) => a.key === b.key ||
  (a.kind === 'dir' && b.key.startsWith(a.key + '/')) ||
  (b.kind === 'dir' && a.key.startsWith(b.key + '/'));
const fixed = key => ({ key, kind: ['scripts/coord'].includes(key) ? 'dir' : 'file' });
const protectedPath = entry => exclusive.some(key => overlaps(entry, fixed(key)));
const dependencyFiles = ['package.json', 'package-lock.json'];
const migrationRoot = 'supabase/migrations';
const migrationNumber = key => /^supabase\/migrations\/(\d+)[^/]*\.sql$/.exec(key)?.[1];
const resourceDirs = ['node_modules', '.next', '.claude/worktrees', 'sites-release'];
const excluded = entry => isEnvironment(entry.key) ||
  resourceDirs.some(key => overlaps(entry, { key, kind: 'dir' }));

export function safeParent(repo) {
  const parent = path.join(path.dirname(repo.main), path.basename(repo.main) + '-wt');
  if (existsSync(parent)) exigir(lstatSync(parent).isDirectory() && !lstatSync(parent).isSymbolicLink() &&
    samePath(realpathSync(parent), parent), 'La carpeta de worktrees debe ser local y directa.');
  return parent;
}

export function availableRules(repo, base) {
  const rules = git(repo.root, ['log', '-1', '--format=%H', MAIN, '--',
    'scripts/coord.mjs', 'scripts/coord', 'AGENTS.md', 'CLAUDE.md']).trim();
  exigir(ref(repo.root, MAIN + ':scripts/coord.mjs') && rules && ancestor(repo.root, rules, base),
    'La base no incluye las reglas de coordinación vigentes. Incorporá la base antes de editar.');
}

export function requests(repo, flags, { initial = false, fromMain = false, supplied } = {}) {
  const cwd = fromMain ? repo.root : repo.cwd;
  const actual = new Map(safeTreePaths(repo.root).map(name => [name.normalize('NFC').toLowerCase(), name]));
  const entries = [];
  for (const [kind, values] of [['file', supplied ?? flags.archivo], ['dir', flags.carpeta]]) {
    for (const raw of values) {
      const { key, name } = ruta(repo.root, cwd, raw);
      const entry = { kind, key, name: actual.get(key) ?? name };
      exigir(!excluded(entry), 'Ruta fuera del alcance de coordinación: ' + name);
      exigir(initial || !protectedPath(entry), 'Ruta reservada al integrador: ' + name);
      if (overlaps(entry, { key: migrationRoot, kind: 'dir' })) {
        exigir(kind === 'file' && migrationNumber(key), 'Reservá la migración por nombre exacto con prefijo numérico.');
      }
      entries.push(entry);
    }
  }
  return entries;
}

function conflicts(a, b) {
  if (overlaps(a, b)) return true;
  const prefix = migrationNumber(a.key);
  return Boolean(prefix && prefix === migrationNumber(b.key));
}

function knownWorktree(repo, row) {
  return row.root && worktrees(repo.root).some(worktree => samePath(worktree.root, row.root) && !worktree.prunable);
}

export function grant(db, id, additions) {
  const current = claims(db, id);
  const combined = [...current, ...additions];
  exigir(combined.length, 'Indicá al menos un --archivo o una --carpeta.');
  const packageClaims = dependencyFiles.map(key => combined.some(claim => overlaps(claim, fixed(key))));
  exigir(packageClaims[0] === packageClaims[1], 'Reservá package.json y package-lock.json juntos.');
  const other = db.prepare('SELECT task,kind,name,key FROM reservations WHERE task<>?').all(id);
  for (const entry of additions) {
    const samePrefix = combined.find(item => item.key !== entry.key && conflicts(item, entry) &&
      migrationNumber(item.key) && migrationNumber(entry.key));
    exigir(!samePrefix, 'Prefijo de migración repetido: ' + entry.name + ' y ' + samePrefix?.name);
    const conflict = other.find(item => conflicts(item, entry));
    exigir(!conflict, entry.name + ' cruza la reserva de ' + conflict?.task + ': ' + conflict?.name);
  }
  const statement = db.prepare('INSERT OR IGNORE INTO reservations(task,kind,name,key) VALUES(?,?,?,?)');
  for (const entry of additions) statement.run(id, entry.kind, entry.name, entry.key);
}

export function known(db, except) {
  const unknown = allTasks(db).filter(row => row.status === 'desconocida' && row.id !== except);
  exigir(!unknown.length, 'Reservas desconocidas en ' + unknown.map(row => row.id).join(', ') +
    '. Redeclará su alcance con adoptar antes de continuar.');
}

export function getTask(db, repo, flags, states = ['activa']) {
  const mark = jsonFile(marker(repo.dir));
  const id = flags.tarea ?? mark?.id;
  exigir(id && idPattern.test(id), 'Este worktree no tiene una tarea registrada.');
  const row = task(db, id);
  const reserved = claims(db, id).map(entry => entry.name).join(', ');
  exigir(row && states.includes(row.status) && (row.agent === 'claude-nube'
    ? samePath(repo.root, repo.main)
    : mark?.id === id && row.token === mark.token && samePath(row.root, repo.root)),
  'La tarea perdió su reserva o cambió de estado: ' + id + '. Rutas anteriores: ' + (row?.note?.startsWith('Rutas: ') ? row.note.slice(7) : reserved || 'consultá el diff.'));
  return row;
}

export function verifyScope(db, repo, row, paths, sha) {
  const allowed = claims(db, row.id);
  const special = new Set(sha ? git(repo.root, ['ls-tree', '-r', '-z', sha]).split('\0')
    .filter(line => /^(120000|160000) /.test(line)).map(line => line.slice(line.indexOf('\t') + 1)) : []);
  const outside = [];
  for (const file of paths) {
    try {
      const entry = { ...ruta(repo.root, repo.root, file), kind: 'file' };
      if (special.has(file) || excluded(entry) || protectedPath(entry) || !allowed.some(claim => overlaps(entry, claim))) outside.push(file);
    } catch {
      outside.push(file);
    }
  }
  exigir(!outside.length, 'Cambios fuera de reserva: ' + outside.join(', '));
  return allowed.map(entry => entry.name);
}

function checkBranch(repo, row) {
  const tip = head(repo.root);
  exigir(branch(repo.root) === row.branch && ancestor(repo.root, row.base, tip),
    'La rama o la base del worktree cambiaron. Revisá su historial.');
  return tip;
}

export function reserveTask(db, repo, flags, mode) {
  const id = flags.tarea;
  exigir(id && id.length <= 48 && idPattern.test(id), 'Usá --tarea con un identificador breve en minúsculas.');
  const previous = task(db, id);
  const agent = flags.agente ?? previous?.agent;
  exigir(['codex', 'claude', 'claude-nube'].includes(agent), 'Indicá --agente codex, claude o claude-nube.');
  const initial = id === 'tarea-0';
  exigir(!initial || (mode === 'adoptar' && agent === 'codex' && samePath(repo.root, repo.main)), 'La tarea-0 se adopta desde main.');
  exigir(initial || !previous || (mode === 'adoptar' && previous.status === 'desconocida'),
    'La tarea ya existe. Usá otra identificación o ampliá la actual.');
  if (!initial && !previous) known(db);
  if (!initial && previous) exigir(previous.status === 'desconocida' && agent === previous.agent,
    'La tarea ya está registrada.');

  const base = flags.base ?? previous?.base ?? ref(repo.root, MAIN);
  exigir(isSha(base) && ref(repo.root, base + '^{commit}') === base, 'Indicá un SHA base de commit completo.');
  const main = samePath(repo.root, repo.main);

  if (initial) {
    exigir(branch(repo.root) === 'main' && head(repo.root) === base, 'main ya no está en la base de la tarea-0.');
    const named = 'refs/coord/respaldos/tarea-0/' + base + '/antes-de-coordinacion';
    const backup = ref(repo.root, named);
    exigir(backup && tree(repo.root, backup) === backup, 'Falta el respaldo inicial de la tarea-0.');
    const files = diff(repo.root, base, backup);
    const reserved = requests(repo, { ...flags, carpeta: [] }, { initial, fromMain: true, supplied: files });
    const row = { id, agent, root: repo.root, branch: 'main', base, token: previous?.token ?? randomUUID(), status: 'activa', backup };
    if (!previous) insert(db, row);
    grant(db, id, reserved);
    db.prepare('UPDATE tasks SET root=?, status=?, backup=? WHERE id=?').run(repo.root, 'activa', backup, id);
    putMarker(marker(repo.dir), { id, agent, base, token: row.token });
    return { id, root: repo.root, base, reservas: claims(db, id).map(entry => entry.name), respaldo: backup };
  }

  availableRules(repo, base);
  const additions = requests(repo, flags, { fromMain: agent === 'claude-nube' });
  const token = previous?.token ?? randomUUID();
  const namespace = agent === 'codex' ? 'codex' : 'claude';
  let root = repo.root;
  let taskBranch = branch(root);
  let activeMarker = marker(repo.dir);
  if (agent === 'claude-nube') {
    exigir(main && mode === 'adoptar', 'Reservá las tareas de la nube desde la carpeta principal con adoptar.');
    const published = ref(repo.root, 'refs/remotes/origin/main^{commit}');
    exigir(published && ancestor(repo.root, base, published), 'La base debe estar publicada en origin/main.');
    // La rama de entrega se resuelve únicamente en refs/remotes/origin.
    taskBranch = flags.rama;
    exigir(!previous || (flags.base && (!previous.branch || previous.branch === taskBranch)),
      'Indicá la base y la rama original de la tarea recuperada.');
    exigir(taskBranch?.startsWith('claude/') &&
      git(root, ['check-ref-format', 'refs/heads/' + taskBranch], { codes: [1] }) !== null, 'Indicá --rama claude/…');
    root = null;
  } else if (mode === 'iniciar') {
    exigir(main && branch(repo.root) === 'main', 'Creá el worktree desde la carpeta principal en main.');
    const parent = safeParent(repo);
    root = path.join(parent, namespace + '-' + id);
    taskBranch = namespace + '/' + id;
    exigir(!existsSync(root) && !ref(repo.root, 'refs/heads/' + taskBranch) &&
      !worktrees(repo.root).some(worktree => samePath(worktree.root, root)), 'La rama o el worktree ya existen. Usá adoptar si corresponde.');
  } else {
    exigir(!main && taskBranch?.startsWith(namespace + '/') && ancestor(root, base, head(root)),
      'Abrí el worktree de la tarea. Su rama y su base deben coincidir.');
    const existingMark = jsonFile(activeMarker);
    exigir(!existingMark || existingMark.id === id || task(db, existingMark.id)?.status === 'liberada',
      'Este worktree ya está asociado a ' + existingMark?.id);
  }
  if (!previous) insert(db, { id, agent, root, branch: taskBranch, base, token, status: 'activa' });
  grant(db, id, additions);
  if (mode === 'iniciar') {
    mkdirSync(path.dirname(root), { recursive: true });
    git(repo.root, ['worktree', 'add', '-b', taskBranch, '--', root, base]);
    activeMarker = marker(git(root, ['rev-parse', '--path-format=absolute', '--git-dir']).trim());
  }
  if (root) putMarker(activeMarker, { id, agent, base, token });
  else {
    const file = cloudMarker(repo, id);
    mkdirSync(path.dirname(file), { recursive: true });
    putMarker(file, { id, agent, base, token, branch: taskBranch });
  }
  db.prepare('UPDATE tasks SET root=?,branch=?,base=?,status=? WHERE id=?').run(root, taskBranch, base, 'activa', id);
  if (previous?.delivery) {
    const frozen = previous.delivery;
    exigir(ancestor(repo.root, base, frozen), 'La base declarada no pertenece a la entrega recuperada.');
    verifyScope(db, repo, { id }, diff(repo.root, base, frozen), frozen);
    db.prepare('UPDATE tasks SET tree=? WHERE id=?').run(tree(repo.root, frozen), id);
  }
  return { id, root, base, rama: taskBranch, reservas: claims(db, id).map(entry => entry.name) };
}

export function validateTask(db, repo, row) {
  if (row.id === 'tarea-0') {
    const reserved = claims(db, row.id);
    const unreserved = dirty(repo.root).filter(file => !reserved.some(claim => claim.key === file.normalize('NFC').toLowerCase()));
    return { id: row.id, reservas: reserved.map(entry => entry.name), respaldo: row.backup, sinReserva: unreserved };
  }
  known(db, row.id);
  availableRules(repo, row.base);
  if (row.agent === 'claude-nube') return { id: row.id, reservas: claims(db, row.id).map(entry => entry.name) };
  const tip = checkBranch(repo, row);
  const paths = [...new Set([...diff(repo.root, row.base, tip), ...dirty(repo.root)])];
  return { id: row.id, reservas: verifyScope(db, repo, row, paths, tip), cambios: paths };
}

export function deliver(db, repo, flags) {
  const row = getTask(db, repo, flags, ['activa', 'entregada']);
  exigir(row.id !== 'tarea-0', 'La tarea-0 se resuelve con un commit autorizado en main y liberar.');
  known(db, row.id);
  availableRules(repo, row.base);
  if (row.delivery) {
    exigir(ref(repo.root, deliveryRef(row.id)) === row.delivery, 'Falta la referencia de entrega congelada.');
    exigir(row.status !== 'entregada', 'Entrega ya congelada en ' + row.delivery + '.');
  }
  exigir(flags.nota && flags.pruebas && !/[\r\n]/.test(flags.nota) && flags.nota.length <= 300,
    'Indicá --nota de una línea y --pruebas.');
  const dependencies = [...new Set(flags.depende)];
  for (const id of dependencies) exigir(id !== row.id && task(db, id), 'Dependencia no válida: ' + id);
  function reachesSelf(id, visited) {
    exigir(id !== row.id, 'Dependencia circular en ' + row.id);
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of JSON.parse(task(db, id).dependencies)) reachesSelf(dep, visited);
  }
  for (const id of dependencies) reachesSelf(id, new Set());
  const local = row.agent !== 'claude-nube';
  const changed = local ? dirty(repo.root) : [];
  const sha = row.delivery ?? (local ? checkBranch(repo, row) : ref(repo.root, 'refs/remotes/origin/' + row.branch));
  exigir(sha && ancestor(repo.root, row.base, sha), 'Falta el SHA a entregar o la rama no contiene su base.');
  const paths = diff(repo.root, row.base, sha);
  verifyScope(db, repo, row, [...new Set([...paths, ...changed])], sha);
  exigir(!local || (!changed.length && idle(repo.root)), 'El worktree debe estar limpio, sin operaciones pendientes y con commits autorizados.');
  exigir(paths.length, 'La rama no tiene cambios para entregar.');
  immutableRef(repo.root, deliveryRef(row.id), sha);
  db.prepare("UPDATE tasks SET status='entregada',delivery=?,tree=?,note=?,tests=?,dependencies=? WHERE id=?")
    .run(sha, tree(repo.root, sha), flags.nota, flags.pruebas, JSON.stringify(dependencies), row.id);
  return { id: row.id, sha, cambios: paths, dependencias: dependencies };
}

export function release(db, repo, flags) {
  const row = getTask(db, repo, flags, ['activa', 'entregada']);
  const live = row.root && existsSync(row.root);
  exigir(!live || knownWorktree(repo, row), 'Git no reconoce el worktree de esta tarea. Revisá el respaldo.');
  const changes = live ? dirty(row.root) : [];
  exigir(!changes.length && (live ? idle(row.root) : row.delivery || row.agent === 'claude-nube'),
    'Conservá la reserva hasta que el worktree esté limpio. Los cambios se preservaron.');
  if (row.id === 'tarea-0') {
    const covered = diff(repo.root, row.base, row.backup);
    const current = git(repo.root, ['diff', '--name-only', '-z', row.backup, MAIN, '--', ...covered]).split('\0').filter(Boolean);
    exigir(!current.length || flags.confirmar, 'El contenido de la tarea-0 difiere de su respaldo. Revisalo y confirmá la liberación.');
  }
  const integration = db.prepare('SELECT pid FROM integration WHERE task=?').get(row.id);
  exigir(!integration?.pid, 'La tarea tiene una integración en ejecución o pendiente de recuperación.');
  const paths = claims(db, row.id).map(entry => entry.name);
  const file = row.agent === 'claude-nube' ? cloudMarker(repo, row.id) : marker(repo.dir);
  putMarker(file, { id: row.id, agent: row.agent, branch: row.branch, base: row.base, token: row.token, released: true, paths });
  db.prepare('DELETE FROM integration WHERE task=?').run(row.id);
  db.prepare('UPDATE tasks SET note=? WHERE id=?').run('Rutas: ' + paths.join(', '), row.id);
  closeTask(db, row.id, 'liberada');
  return { id: row.id, estado: 'liberada' };
}
