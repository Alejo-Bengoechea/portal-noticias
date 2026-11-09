const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const React = require('react');

// Load the real server component with the classic JSX runtime (React.createElement),
// so we can inspect the returned element tree directly without a DOM renderer.
function loadPublicLayout(getTerms) {
  const file = join(__dirname, '..', 'app', '(public)', 'layout.tsx');
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const mocks = {
    'next/link': { default: 'Link' },
    '@/components/edition-date': { EditionDate: 'EditionDate' },
    '@/components/page-view': { PageView: 'PageView' },
    '@/lib/supabase': { configured: false },
    '@/lib/articles': { getTerms },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'React', code)(
    name => { assert.ok(name in mocks, `Import no previsto en el test: ${name}`); return mocks[name]; },
    module, module.exports, React,
  );
  return module.exports.default;
}

// Walk a React element tree without rendering it (no ReactDOM / test environment needed).
function* walk(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const item of node) yield* walk(item); return; }
  if (node.$$typeof) {
    yield node;
    yield* walk(node.props?.children);
  }
}
function links(tree) {
  return [...walk(tree)].filter(node => node.type === 'Link').map(node => ({ href: node.props.href, text: flatten(node.props.children) }));
}
function flatten(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(flatten).join('');
  if (children && typeof children === 'object' && children.props) return flatten(children.props.children);
  return '';
}

test('el menú del portal enlaza a las categorías reales, no a slugs fijos', async () => {
  const categories = [
    { id: 'a', name: 'ESPAÑA', slug: 'espana' },
    { id: 'b', name: 'NACIONAL', slug: 'nacional' },
    { id: 'c', name: 'TECNOLOGÍA', slug: 'tecnologia' },
  ];
  const PublicLayout = loadPublicLayout(async () => categories);
  const tree = await PublicLayout({ children: null });
  const navLinks = links(tree).filter(l => l.href.startsWith('/categoria/') || l.href === '/derechos' || l.href === '/privacidad');
  assert.deepEqual(navLinks.map(l => l.href), ['/categoria/espana', '/categoria/nacional', '/categoria/tecnologia', '/derechos', '/privacidad']);
  assert.deepEqual(navLinks.slice(0, 3).map(l => l.text), ['ESPAÑA', 'NACIONAL', 'TECNOLOGÍA']);
  for (const stale of ['/categoria/internacional', '/categoria/economia']) assert.ok(!navLinks.some(l => l.href === stale), `No debe quedar el enlace fijo ${stale}`);
});

test('sin categorías, el menú no rompe y solo queda Inicio', async () => {
  const PublicLayout = loadPublicLayout(async () => []);
  const tree = await PublicLayout({ children: null });
  const navLinks = links(tree);
  assert.ok(!navLinks.some(l => l.href.startsWith('/categoria/')), 'No debe haber enlaces de categoría sin categorías');
});

test('si getTerms falla, el menú se degrada a solo Inicio en vez de romper el portal', async () => {
  const PublicLayout = loadPublicLayout(async () => { throw new Error('Supabase no disponible'); });
  const tree = await PublicLayout({ children: null });
  const navLinks = links(tree);
  assert.ok(!navLinks.some(l => l.href.startsWith('/categoria/')));
  assert.ok(navLinks.some(l => l.href === '/derechos'));
});

test('con muchas categorías, el menú muestra todas sin recortar', async () => {
  const categories = Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `CATEGORÍA ${i}`, slug: `categoria-${i}` }));
  const PublicLayout = loadPublicLayout(async () => categories);
  const tree = await PublicLayout({ children: null });
  const navLinks = links(tree);
  assert.equal(navLinks.filter(l => l.href.startsWith('/categoria/')).length, 6);
});
