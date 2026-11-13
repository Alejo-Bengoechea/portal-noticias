const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(`${__dirname}/../${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => { assert.ok(name in mocks, name); return mocks[name]; }, exports);
  return exports;
}

test('sin Supabase no aparecen noticias ni categorías inventadas en el portal', async () => {
  const api = load('lib/articles.ts', { react: { cache: fn => fn }, './supabase': { publicClient: () => null } });
  assert.deepEqual(await api.getTerms('categories'), []);
  assert.deepEqual(await api.getTerms('tags'), []);
  assert.deepEqual(await api.getArticles(), []);
  assert.equal(await api.getFeatured(), null);
  assert.equal(await api.getArticle('las-ciudades-que-queremos'), null);
});

test('el gestor consulta Supabase incluso con el antiguo parámetro de ejemplos', async () => {
  let reads = 0;
  const query = {
    select() { reads++; return this; }, or() { return this; }, order() { return this; }, range() { return this; },
    then(resolve, reject) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject); },
  };
  const api = load('lib/news-management.ts', { './articles': { getTerms: async () => [] } });
  const result = await api.managedNewsBatch({ datos: 'ejemplo' }, 0, { from: () => query });
  assert.equal(reads, 1);
  assert.deepEqual(result.data, []);
  assert.deepEqual(result.categories, []);
  assert.equal(result.count, 0);
});

const coverId = 'ed8abe29-d34a-46c4-bcaf-789f4642f74b';
const coverRow = {
  id: coverId, slug: 'portada', title: 'Titular de portada', subtitle: '', cover_url: null,
  cover_alt: '', published_at: '2026-11-10T10:00:00Z', category: { name: 'España' }, featured: true,
};

test('un fallo parcial del inicio conserva los recuentos disponibles y la portada', async () => {
  const results = [
    () => ({ count: 1 }),
    () => { throw new Error('Conexión interrumpida'); },
    () => ({ count: 0 }),
    () => ({ error: { code: '503' } }),
    () => ({ data: coverRow }),
  ];
  const orders = [];
  const client = {
    from(table) {
      assert.equal(table, 'articles');
      const result = results.shift();
      const query = {
        select() { return this; }, not() { return this; }, is() { return this; },
        or() { return this; }, eq() { return this; }, lte() { return this; },
        order(column) { if (result === coverResult) orders.push(column); return this; },
        limit() { return this; }, maybeSingle() { return this; },
        then(resolve, reject) { return Promise.resolve().then(result).then(resolve, reject); },
      };
      return query;
    },
  };
  const coverResult = results.at(-1);
  const { editorialHomeData } = load('lib/editorial-home.ts', {});
  const result = await editorialHomeData(client);
  assert.deepEqual(result.counts, { published: 1, unpublished: null, drafts: 0 });
  assert.deepEqual(result.errors, { counts: true, drafts: true, cover: false });
  assert.deepEqual(orders, ['featured', 'published_at', 'id']);
  assert.equal(result.cover.id, coverId);
});

test('el inicio enlaza los recuentos a sus gestores y la portada a su publicación', () => {
  const { EditorialHome } = load('components/editorial-home.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: React,
    'next/link': { default: 'a' },
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/format': { webUrl: () => null },
  });
  const markup = renderToStaticMarkup(React.createElement(EditorialHome, {
    data: {
      counts: { published: 1, unpublished: 0, drafts: 1 },
      drafts: [{ id: 'draft', title: 'Borrador', updatedAt: null, category: 'Sin categoría' }],
      cover: { ...coverRow, publishedAt: coverRow.published_at, category: 'ESPAÑA' },
      errors: { counts: false, drafts: false, cover: false },
    },
  }));
  for (const href of [
    '/mesa-editorial-7k4n/publicaciones?estado=publicado',
    '/mesa-editorial-7k4n/publicaciones?estado=despublicado',
    '/mesa-editorial-7k4n/borradores',
    '/mesa-editorial-7k4n/articulos/draft',
    '/noticia/portada',
    `/mesa-editorial-7k4n/publicaciones?estado=publicado&amp;q=${coverId}`,
  ]) assert.ok(markup.includes(`href="${href}"`), href);
});
