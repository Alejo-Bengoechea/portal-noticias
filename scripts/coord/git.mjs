import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

export function exigir(condition, message) {
  if (!condition) throw new Error(message);
}

export function git(cwd, args, options = {}) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith('GIT_')) delete env[name];
  }
  const result = spawnSync('git', ['--no-optional-locks', '--literal-pathspecs', ...args], {
    cwd, env: { ...env, GIT_TERMINAL_PROMPT: '0', ...options.env },
    input: options.input, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (options.codes?.includes(result.status)) return null;
  exigir(result.status === 0, result.stderr.trim() || result.stdout.trim() || 'Falló Git.');
  return result.stdout;
}

export function worktrees(cwd) {
  return git(cwd, ['worktree', 'list', '--porcelain', '-z']).split('\0\0').filter(Boolean).map(entry => {
    const fields = new Map(entry.split('\0').map(field => {
      const space = field.indexOf(' ');
      return space < 0 ? [field, ''] : [field.slice(0, space), field.slice(space + 1)];
    }));
    return {
      root: path.normalize(fields.get('worktree')),
      head: fields.get('HEAD'),
      branch: fields.get('branch')?.replace(/^refs\/heads\//, '') ?? null,
      prunable: fields.has('prunable'),
    };
  });
}

export function repo(cwd = process.cwd()) {
  const root = realpathSync(git(cwd, ['rev-parse', '--show-toplevel']).trim());
  const absolute = name => realpathSync(git(root, ['rev-parse', '--path-format=absolute', name]).trim());
  const common = absolute('--git-common-dir');
  const stats = lstatSync(common);
  exigir(stats.isDirectory() && !common.startsWith('\\\\'), 'El registro requiere un repositorio en disco local.');
  const main = worktrees(root)[0];
  exigir(main?.head && existsSync(main.root), 'Falta el worktree principal.');
  return { cwd: realpathSync(cwd), root, main: realpathSync(main.root), dir: absolute('--git-dir'), common };
}

export const ref = (cwd, name) => git(cwd, ['rev-parse', '--verify', '--quiet', name], { codes: [1] })?.trim() ?? null;
export const head = cwd => ref(cwd, 'HEAD^{commit}');
export const tree = (cwd, sha) => ref(cwd, sha + '^{tree}');
export const branch = cwd => git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { codes: [1] })?.trim() ?? null;
export const ancestor = (cwd, base, end) => git(cwd, ['merge-base', '--is-ancestor', base, end], { codes: [1] }) !== null;
export const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
export const MAIN = 'refs/heads/main';
export const isSha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);

export function immutableRef(cwd, name, sha) {
  const current = ref(cwd, name);
  if (current === sha) return;
  exigir(!current, 'La referencia ya apunta a otro objeto: ' + name);
  git(cwd, ['update-ref', name, sha, '0'.repeat(sha.length)]);
}

export function diff(cwd, base, end) {
  const fields = git(cwd, ['diff', '--name-status', '-z', '-M', base, end, '--']).split('\0');
  const paths = [];
  for (let i = 0; fields[i];) {
    const status = fields[i++];
    paths.push(fields[i++]);
    if (/^[RC]/.test(status)) paths.push(fields[i++]);
  }
  return [...new Set(paths)];
}

export function dirty(cwd) {
  const fields = git(cwd, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none']).split('\0');
  const paths = [];
  for (let i = 0; fields[i]; i++) {
    const line = fields[i];
    const prefix = line[0];
    if (prefix === '1') paths.push(line.split(' ').slice(8).join(' '));
    if (prefix === '2') paths.push(line.split(' ').slice(9).join(' '), fields[++i]);
    if (prefix === 'u') paths.push(line.split(' ').slice(10).join(' '));
    if (prefix === '?') paths.push(line.slice(2));
  }
  return [...new Set(paths)];
}

export function idle(cwd) {
  const dir = git(cwd, ['rev-parse', '--absolute-git-dir']).trim();
  const operations = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'];
  return !operations.some(name => existsSync(path.join(dir, name)));
}

export function ruta(root, cwd, value) {
  exigir(typeof value === 'string' && value, 'Indicá una ruta.');
  const raw = value.replaceAll('\\', '/');
  const components = raw.replace(/^[a-z]:\//i, '/').split('/');
  exigir(!raw.startsWith('//') && !/^[a-z]:(?!\/)/i.test(raw) && !components.includes('..') &&
    !components.some(part => part !== '.' && (
      /[. ]$|[<>:"|?*\x00-\x1f]/.test(part) || /~\d+(?:\.|$)/.test(part) ||
      /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part)
    )), 'Ruta no admitida: ' + value);
  const absolute = path.resolve(cwd, raw);
  const relative = path.relative(root, absolute);
  exigir(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep),
    'La ruta debe estar dentro del repositorio: ' + value);
  const name = relative.split(path.sep).join('/');
  const key = name.normalize('NFC').toLowerCase();
  exigir(!key.split('/').includes('.git'), 'La ruta .git no se puede reservar.');
  let parent = root;
  for (const component of relative.split(path.sep)) {
    parent = path.join(parent, component);
    try {
      exigir(!lstatSync(parent).isSymbolicLink(), 'La ruta atraviesa un enlace: ' + value);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') break;
      throw error;
    }
  }
  return { name, key };
}

export function safeTreePaths(cwd) {
  return git(cwd, ['ls-files', '-z']).split('\0').filter(Boolean);
}

export function isEnvironment(file) {
  const name = file.split('/').at(-1).toLowerCase();
  return name.startsWith('.env') && name !== '.env.example';
}
