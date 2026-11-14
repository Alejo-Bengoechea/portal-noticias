import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ancestor, exigir, git, isSha, ref, samePath, worktrees } from './git.mjs';

// Node 22 etiqueta node:sqlite como experimental. Conserva los demás avisos.
const emitWarning = process.emitWarning;
let DatabaseSync;
try {
  process.emitWarning = function (message, type, ...args) {
    if (type === 'ExperimentalWarning' && String(message).startsWith('SQLite is an experimental feature')) return;
    return emitWarning.call(this, message, type, ...args);
  };
  ({ DatabaseSync } = await import('node:sqlite'));
} finally {
  process.emitWarning = emitWarning;
}

export const location = repo => path.join(repo.common, 'coord');
export const marker = dir => path.join(dir, 'coord-task.json');
export const cloudMarker = (repo, id) => path.join(location(repo), 'nube', id + '.json');
export const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function jsonFile(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function putMarker(file, value) {
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temp, JSON.stringify(value), { flag: 'wx', mode: 0o600 });
    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

function marks(repo) {
  const linked = path.join(repo.common, 'worktrees');
  const directories = new Map([[repo.main, repo.common]]);
  if (existsSync(linked)) {
    for (const entry of readdirSync(linked, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(linked, entry.name);
      const pointer = path.join(dir, 'gitdir');
      if (existsSync(pointer)) directories.set(path.dirname(path.resolve(dir, readFileSync(pointer, 'utf8').trim())), dir);
    }
  }
  const result = [];
  for (const worktree of worktrees(repo.root)) {
    if (worktree.prunable || !existsSync(worktree.root)) continue;
    const dir = [...directories].find(([root]) => samePath(root, worktree.root))?.[1];
    exigir(dir, 'Git no identifica el directorio privado de ' + worktree.root);
    const mark = jsonFile(marker(dir));
    if (!mark) {
      const managed = /^(codex|claude)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(worktree.branch ?? '');
      const parent = path.join(path.dirname(repo.main), path.basename(repo.main) + '-wt');
      if (managed && samePath(worktree.root, path.join(parent, managed[1] + '-' + managed[2]))) {
        // Una caída entre worktree add y la marca no vuelve disponible su alcance.
        result.push({ id: managed[2], agent: managed[1], base: worktree.head, root: worktree.root, branch: worktree.branch });
      }
      continue;
    }
    exigir(idPattern.test(mark.id) && isSha(mark.base) && typeof mark.token === 'string' &&
      ['codex', 'claude', 'claude-nube'].includes(mark.agent), 'Marca de tarea no válida: ' + worktree.root);
    result.push({ ...mark, root: worktree.root, dir, branch: worktree.branch });
  }
  const cloud = path.join(location(repo), 'nube');
  if (existsSync(cloud)) {
    for (const file of readdirSync(cloud).filter(name => name.endsWith('.json'))) {
      const mark = jsonFile(path.join(cloud, file));
      exigir(mark && file === mark.id + '.json' && idPattern.test(mark.id) && isSha(mark.base) &&
        mark.agent === 'claude-nube' && typeof mark.token === 'string' && typeof mark.branch === 'string' &&
        mark.branch.startsWith('claude/'), 'Marca de tarea en la nube no válida: ' + file);
      result.push({ ...mark, root: null });
    }
  }
  return result;
}

function gitDeliveries(repo) {
  return git(repo.root, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/coord/entregas/'])
    .trim().split(/\r?\n/).filter(Boolean).map(line => {
      const [name, sha] = line.split(' ');
      return { id: name.split('/').at(-1), sha };
    });
}

export function open(repo) {
  const folder = location(repo);
  mkdirSync(folder, { recursive: true });
  const db = new DatabaseSync(path.join(folder, 'registro.sqlite'));
  try {
    db.exec('PRAGMA busy_timeout=15000; PRAGMA foreign_keys=ON;');
    transaction(db, () => {
      const { user_version: version } = db.prepare('PRAGMA user_version').get();
      exigir(version <= 1, 'El registro requiere una CLI más reciente.');
      if (version === 1) return;
      db.exec(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, agent TEXT NOT NULL, root TEXT, branch TEXT, base TEXT NOT NULL,
          token TEXT NOT NULL, status TEXT NOT NULL, backup TEXT, delivery TEXT, tree TEXT,
          note TEXT, tests TEXT, dependencies TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE reservations (
          task TEXT NOT NULL REFERENCES tasks(id), kind TEXT NOT NULL, name TEXT NOT NULL, key TEXT NOT NULL,
          PRIMARY KEY(task, kind, key)
        );
        CREATE TABLE integration (
          singleton INTEGER PRIMARY KEY CHECK(singleton=1), task TEXT NOT NULL REFERENCES tasks(id),
          base TEXT NOT NULL, candidate TEXT, pid INTEGER, ready INTEGER NOT NULL DEFAULT 0
        );
        PRAGMA user_version=1;
      `);
    });
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function transaction(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export const task = (db, id) => db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
export const allTasks = db => db.prepare('SELECT * FROM tasks ORDER BY id').all();
export const claims = (db, id) => db.prepare('SELECT kind,name,key FROM reservations WHERE task=? ORDER BY key').all(id);
export const deliveryRef = id => 'refs/coord/entregas/' + id;
export const candidateRef = (id, base) => 'refs/coord/candidatos/' + id + '/' + base;

export function insert(db, data) {
  db.prepare('INSERT INTO tasks(id,agent,root,branch,base,token,status,backup) VALUES(?,?,?,?,?,?,?,?)')
    .run(data.id, data.agent, data.root, data.branch, data.base, data.token, data.status, data.backup ?? null);
}

export function reconcile(db, repo, main) {
  for (const mark of marks(repo)) {
    const existing = task(db, mark.id);
    if (mark.released && (!existing || existing.token === mark.token)) {
      if (!existing) insert(db, { ...mark, status: 'liberada' });
      closeTask(db, mark.id, 'liberada');
      db.prepare('UPDATE tasks SET note=? WHERE id=?').run('Rutas: ' + (mark.paths ?? []).join(', '), mark.id);
      continue;
    }
    if (!existing) {
      insert(db, { ...mark, token: mark.token ?? randomUUID(), status: 'desconocida' });
    } else if (!mark.token && existing.status === 'activa') {
      db.prepare("UPDATE tasks SET status='desconocida' WHERE id=?").run(mark.id);
    } else if (mark.root && existing.token === mark.token && !samePath(existing.root ?? '', mark.root)) {
      db.prepare('UPDATE tasks SET root=? WHERE id=?').run(mark.root, mark.id);
    } else if (mark.token && existing.token !== mark.token && existing.status !== 'liberada') {
      throw new Error('La marca no coincide con el registro de ' + mark.id + '. Revisá la recuperación.');
    }
  }
  for (const entry of gitDeliveries(repo)) {
    if (!task(db, entry.id)) {
      // Sin marca ni SQLite no se conoce la base ni el alcance de la entrega.
      insert(db, {
        id: entry.id, agent: 'claude-nube', root: null, branch: null, base: main,
        token: randomUUID(), status: 'desconocida',
      });
    }
    const row = task(db, entry.id);
    exigir(!row.delivery || row.delivery === entry.sha, 'La referencia de entrega cambió: ' + entry.id);
    if (!row.delivery) db.prepare("UPDATE tasks SET delivery=? WHERE id=? AND status<>'liberada'").run(entry.sha, entry.id);
  }
  for (const row of allTasks(db)) {
    if (!row.delivery || row.status === 'integrada' || row.status === 'liberada') continue;
    if (ancestor(repo.root, row.delivery, main)) closeTask(db, row.id, 'integrada');
  }
  db.prepare("DELETE FROM integration WHERE task IN (SELECT id FROM tasks WHERE status IN ('integrada','liberada'))").run();
  // La tarea inicial también sobrevive si se pierde el registro antes de adoptarla.
  if (!task(db, 'tarea-0')) {
    const backups = git(repo.root, ['for-each-ref', '--format=%(refname)', 'refs/coord/respaldos/tarea-0/']).trim();
    const name = backups.split(/\r?\n/).find(line => line.endsWith('/antes-de-coordinacion'));
    if (name) insert(db, {
      id: 'tarea-0', agent: 'codex', root: repo.main, branch: 'main', base: name.split('/').at(-2),
      token: randomUUID(), status: 'desconocida', backup: ref(repo.root, name),
    });
  }
}

export function closeTask(db, id, status) {
  db.prepare('DELETE FROM reservations WHERE task=?').run(id);
  db.prepare('UPDATE tasks SET status=? WHERE id=?').run(status, id);
}
