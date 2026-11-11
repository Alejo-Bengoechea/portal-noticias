const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(`${__dirname}/../${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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
