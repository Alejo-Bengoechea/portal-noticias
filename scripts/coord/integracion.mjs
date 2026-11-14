import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ancestor, branch, diff, dirty, exigir, git, head, idle, immutableRef, isSha, ref, samePath, tree, worktrees } from './git.mjs';
import { candidateRef, deliveryRef, location, reconcile, task, transaction } from './registro.mjs';
import { availableRules, known, safeParent, verifyScope } from './reservas.mjs';

function integrator(repo, flags) {
  exigir(samePath(repo.root, repo.main) && branch(repo.root) === 'main' && flags.agente === 'codex',
    'Codex debe ejecutar la integración desde la carpeta principal en main.');
  exigir(flags.confirmar, 'La operación requiere autorización expresa. Usá --confirmar solo con esa autorización.');
}

function preflight(db, repo, flags) {
  const base = head(repo.main);
  const row = task(db, flags.tarea);
  known(db);
  const initial = task(db, 'tarea-0');
  exigir(!initial || initial.status === 'liberada' || initial.status === 'integrada',
    'Resolvé la tarea-0 antes de integrar.');
  exigir(row?.status === 'entregada' && row.note && row.tests, 'La tarea debe tener una entrega completa.');
  exigir(row.delivery === ref(repo.main, deliveryRef(row.id)) && row.tree === tree(repo.main, row.delivery),
    'El SHA o el árbol de la entrega no coincide.');
  exigir(ancestor(repo.main, row.base, base), 'La base de la tarea aún no está integrada en main.');
  availableRules(repo, row.base);
  // La entrega congelada conserva su alcance aunque la rama de trabajo cambie o se borre.
  verifyScope(db, repo, row, diff(repo.main, row.base, row.delivery), row.delivery);
  for (const id of JSON.parse(row.dependencies)) exigir(task(db, id)?.status === 'integrada',
    'Falta integrar la dependencia ' + id + '.');
  exigir(!dirty(repo.main).length && idle(repo.main), 'La carpeta principal debe estar limpia y sin operaciones Git pendientes.');
  return { base, row };
}

function editorialDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts();
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return [date.year, date.month, date.day].join('-');
}

function memory(old, row, base, date) {
  const original = old.replaceAll('\r\n', '\n');
  exigir(['Última actualización', 'Commit base', 'Árbol al cerrar'].every(label =>
    new RegExp('^- ' + label + ': ', 'm').test(original)) && /^## Registro$/m.test(original),
  'No se reconoce el formato de MEMORIA_IA.md. Revisalo antes de integrar.');
  const agent = row.agent === 'codex' ? 'Codex' : 'Claude Code';
  const newEntry = '- ' + date + ' · ' + agent + ' · ' + row.note + ' · `' + row.delivery.slice(0, 7) + '`.';
  const start = original.indexOf('\n## Registro\n');
  exigir(start >= 0, 'No se encontró el registro de la memoria.');
  const header = original.slice(0, start)
    .replace(/^- Última actualización: .*$/m, '- Última actualización: ' + date + ' · Codex')
    .replace(/^- Commit base: .*$/m, '- Commit base: `' + base.slice(0, 7) + '`')
    .replace(/^- Árbol al cerrar: .*$/m, '- Árbol al cerrar: limpio al integrar. Entrega incluida: `' + row.delivery.slice(0, 7) + '`.');
  const record = original.slice(start + 1).trimEnd();
  const first = record.search(/^- /m);
  const intro = first === -1 ? record : record.slice(0, first).trimEnd();
  const entries = first === -1 ? [] : record.slice(first).split(/\n(?=- )/).map(entry => entry.trimEnd());
  return header + '\n' + intro + '\n\n' + [newEntry, ...entries.filter(entry => entry !== newEntry)].slice(0, 8).join('\n') + '\n';
}

function createCandidate(repo, row, base) {
  const name = candidateRef(row.id, base);
  const existing = ref(repo.main, name);
  if (existing) {
    const parents = git(repo.main, ['show', '-s', '--format=%P', existing]).trim();
    exigir(parents === base + ' ' + row.delivery, 'El candidato guardado no corresponde a esta entrega.');
    return existing;
  }

  // Git fusiona objetos primero. Un conflicto no ensucia ningún worktree.
  const merge = git(repo.main, ['merge-tree', '--write-tree', base, row.delivery], { codes: [1] });
  exigir(merge, 'Git detectó un conflicto. Resolvelo en una tarea con la base vigente y volvé a entregar.');
  const merged = merge.split(/\r?\n/, 1)[0];
  const record = git(repo.main, ['show', merged + ':MEMORIA_IA.md']);
  const blob = git(repo.main, ['hash-object', '-w', '--stdin'], { input: memory(record, row, base, editorialDate()) }).trim();
  const index = path.join(location(repo), 'index-' + randomUUID());
  const options = { env: { GIT_INDEX_FILE: index } };
  try {
    git(repo.main, ['read-tree', merged], options);
    git(repo.main, ['update-index', '--cacheinfo', '100644,' + blob + ',MEMORIA_IA.md'], options);
    const candidateTree = git(repo.main, ['write-tree'], options).trim();
    const candidate = git(repo.main, ['commit-tree', candidateTree, '-p', base, '-p', row.delivery, '-m', 'Integrar tarea ' + row.id]).trim();
    immutableRef(repo.main, name, candidate);
    return candidate;
  } finally {
    rmSync(index, { force: true });
  }
}

function integrationWorktree(repo, sha) {
  const parent = safeParent(repo);
  mkdirSync(parent, { recursive: true });
  const target = path.join(parent, 'integracion');
  const found = worktrees(repo.main).find(worktree => samePath(worktree.root, target));
  if (!found) {
    exigir(!existsSync(target), 'La carpeta de integración ya existe y Git no la reconoce.');
    git(repo.main, ['worktree', 'add', '--detach', '--', target, sha]);
    return target;
  }
  exigir(!found.branch && !found.prunable && existsSync(target) && !lstatSync(target).isSymbolicLink() && !dirty(target).length && idle(target),
    'El worktree de integración tiene cambios o necesita revisión. Consultá al usuario antes de tocarlo.');
  if (found.head !== sha) git(target, ['switch', '--detach', sha]);
  return target;
}

function testCandidate(root) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(?:NEXT_PUBLIC_|SUPABASE_|ADMIN_USER_ID$|INSTAGRAM_|GIT_)/i.test(key)));
  env.NEXT_TELEMETRY_DISABLED = '1';
  const files = ['.env', '.env.local', '.env.production', '.env.production.local', '.env.test', '.env.test.local', '.env.development', '.env.development.local'];
  exigir(!files.some(file => existsSync(path.join(root, file))), 'Quitá del entorno de integración los archivos de configuración real antes de probar.');
  const scripts = [[['test'], 'test'], [['run', 'check'], 'check'], [['run', 'build'], 'build']];
  // npm usa cmd.exe en Windows. Los argumentos son constantes y el cwd no forma parte del comando.
  function npm(args, label) {
    const win = process.platform === 'win32';
    const result = spawnSync(win ? 'cmd.exe' : 'npm', win ? ['/d', '/s', '/c', 'npm.cmd ' + args.join(' ')] : args, {
      cwd: root, stdio: ['ignore', 2, 2], env, windowsHide: true,
    });
    if (result.error) throw result.error;
    exigir(result.status === 0, 'Falló npm ' + label + ' en el worktree de integración.');
  }
  const stamp = [git(root, ['rev-parse', 'HEAD:package-lock.json']).trim(), process.version, process.platform, process.arch].join(' ');
  const stampPath = path.join(root, 'node_modules', '.coord-lock');
  if (!existsSync(stampPath) || readFileSync(stampPath, 'utf8') !== stamp) {
    npm(['ci', '--no-audit', '--no-fund'], 'ci');
    // El archivo queda en node_modules y se invalida con npm ci o al cambiar el lockfile.
    mkdirSync(path.dirname(stampPath), { recursive: true });
    writeFileSync(stampPath, stamp);
  }
  for (const [args, label] of scripts) npm(args, label);
}

function running(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

export function prepare(db, repo, flags) {
  integrator(repo, flags);
  const { row, base } = transaction(db, () => {
    reconcile(db, repo, head(repo.main));
    const result = preflight(db, repo, flags);
    const slot = db.prepare('SELECT * FROM integration').get();
    exigir(!slot || !running(slot.pid), 'Ya se está preparando una integración.');
    db.prepare('DELETE FROM integration').run();
    db.prepare('INSERT INTO integration(singleton,task,base,pid) VALUES(1,?,?,?)').run(result.row.id, result.base, process.pid);
    return result;
  });
  try {
    const candidate = createCandidate(repo, row, base);
    const root = integrationWorktree(repo, candidate);
    testCandidate(root);
    exigir(head(root) === candidate && !dirty(root).length && idle(root) && head(repo.main) === base,
      'Cambió la base o el worktree durante las pruebas. Volvé a preparar.');
    transaction(db, () => {
      const result = db.prepare('UPDATE integration SET ready=1,candidate=?,pid=NULL WHERE task=? AND pid=?')
        .run(candidate, row.id, process.pid);
      exigir(result.changes === 1, 'Cambió el estado de la integración durante las pruebas.');
    });
    const tip = row.branch && ref(repo.main, (row.agent === 'claude-nube' ? 'refs/remotes/origin/' : 'refs/heads/') + row.branch);
    return { id: row.id, candidato: candidate, base, entrega: row.delivery, pruebas: 'test, check y build', ramaMovida: tip !== row.delivery };
  } catch (error) {
    transaction(db, () => db.prepare('DELETE FROM integration WHERE pid=?').run(process.pid));
    throw error;
  }
}

export function confirm(db, repo, flags) {
  integrator(repo, flags);
  exigir(isSha(flags.sha), 'Indicá el SHA completo del candidato autorizado.');
  const recorded = task(db, flags.tarea);
  if (recorded?.status === 'integrada') {
    exigir(flags.sha && ancestor(repo.main, recorded.delivery, flags.sha) && ancestor(repo.main, flags.sha, head(repo.main)),
      'El SHA indicado no corresponde a una integración en main.');
    return { id: flags.tarea, estado: 'integrada' };
  }
  const { row, base } = preflight(db, repo, flags);
  const slot = db.prepare('SELECT * FROM integration WHERE task=?').get(row.id);
  exigir(slot?.ready && slot.base === base && flags.sha === slot.candidate &&
    ref(repo.main, candidateRef(row.id, base)) === slot.candidate && ancestor(repo.main, base, slot.candidate) &&
    ancestor(repo.main, row.delivery, slot.candidate),
  'El candidato autorizado no coincide o cambió main. Prepará de nuevo.');
  const integration = path.join(safeParent(repo), 'integracion');
  exigir(existsSync(integration) && !lstatSync(integration).isSymbolicLink() &&
    head(integration) === slot.candidate && !dirty(integration).length && idle(integration),
  'El worktree de integración cambió desde las pruebas. Revisalo antes de confirmar.');
  exigir(head(repo.main) === base && branch(repo.main) === 'main' && !dirty(repo.main).length,
    'Cambió la carpeta principal antes de confirmar. Volvé a preparar.');
  git(repo.main, ['merge', '--ff-only', slot.candidate]);
  exigir(head(repo.main) === slot.candidate, 'Git no dejó main en el candidato esperado.');
  reconcile(db, repo, slot.candidate);
  return { id: row.id, estado: 'integrada', sha: slot.candidate };
}
