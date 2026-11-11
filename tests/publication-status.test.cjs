const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const originalDate = '2026-10-03T10:00:00.000Z';
const article = (n, published = false) => ({ id: id(n), published_at: published ? originalDate : null, ever_published: true, category_id: id(99) });

// Execute the real server actions against an in-memory PostgREST double.
// No environment credentials, real sessions or remote writes are used.
function setup(rows, { authorized = true, onRead } = {}) {
  const writes = [];
  class Query {
    constructor() { this.filters = []; }
    select() { return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    or(value) { assert.equal(value, 'ever_published.eq.true,body->metadatos->>estado.eq.despublicado'); this.filters.push(row => row.ever_published === true || row.editorial_state === 'despublicado'); return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    is(key, value) { return this.eq(key, value); }
    not(key, operator, value) { assert.equal(operator, 'is'); this.filters.push(row => row[key] !== value); return this; }
    update(patch) { this.patch = patch; return this; }
    delete() { this.remove = true; return this; }
    async run(single = false) {
      const matched = rows.filter(row => this.filters.every(filter => filter(row)));
      if (this.patch || this.remove) {
        matched.forEach(row => { writes.push(row.id); if (this.patch) Object.assign(row, this.patch); else rows.splice(rows.indexOf(row), 1); });
      }
      const data = matched.map(row => ({ ...row }));
      if (!this.patch && !this.remove && onRead) { const callback = onRead; onRead = undefined; callback(rows); }
      return single ? { data: data[0] ?? null, error: data.length === 1 ? null : { code: 'PGRST116' } } : { data, error: null };
    }
    single() { return this.run(true); }
    then(resolve, reject) { return this.run().then(resolve, reject); }
  }
  const client = { from: table => { assert.equal(table, 'articles'); return new Query(); } };
  const mocks = {
    '@/lib/supabase': { adminClient: async () => authorized ? client : null },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect() { throw new Error('Unexpected redirect'); } },
    '@/lib/format': {},
    '@/lib/articles': { getTerms: async () => [] }, '@/lib/news-validation': { validateNewsDocument: () => [] },
  };
  const load = path => {
    const source = readFileSync(`${__dirname}/../app/mesa-editorial-7k4n/${path}`, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    new Function('require', 'exports', code)(name => { assert.ok(name in mocks, name); return mocks[name]; }, exports);
    return exports;
  };
  const bulk = load('bulk-news-actions.ts').bulkNewsAction;
  const action = load('actions.ts').changePublicationStatus;
  const single = (rowId, intent) => { const form = new FormData(); form.set('id', rowId); form.set('intent', intent); return action('', form); };
  return { bulk, single, writes };
}

test('bulk publish preserves original dates and changes only unpublished news', async () => {
  const rows = [article(1, true), article(2)];
  const { bulk, writes } = setup(rows);
  assert.equal((await bulk(rows.map(row => row.id), 'publish')).error, '');
  assert.equal(rows[0].published_at, originalDate);
  assert.ok(rows[1].published_at);
  assert.deepEqual(writes, [id(2)]);
});

test('already published legacy news is a no-op, even without a category', async () => {
  const rows = [{ ...article(1, true), category_id: null }];
  const { bulk, single, writes } = setup(rows);
  assert.equal((await bulk([id(1)], 'publish')).error, '');
  assert.match(await single(id(1), 'publish'), /ya está publicada/);
  assert.equal(rows[0].published_at, originalDate);
  assert.deepEqual(writes, []);
});

test('unpublish changes only published rows; repeated single request is a no-op', async () => {
  const rows = [article(1, true), article(2)];
  const { bulk, single, writes } = setup(rows);
  assert.equal((await bulk([id(1), id(2)], 'unpublish')).error, '');
  assert.match(await single(id(2), 'unpublish'), /no está publicada/);
  assert.deepEqual(writes, [id(1)]);
});

for (const mode of ['bulk', 'single']) {
  for (const invalid of ['draft', 'category', 'unauthorized', 'id']) {
    test(`${mode} rejects ${invalid} without writes`, async () => {
      const rows = [article(1)];
      if (invalid === 'draft') rows[0].ever_published = false;
      if (invalid === 'category') rows[0].category_id = null;
      const api = setup(rows, { authorized: invalid !== 'unauthorized' });
      const selected = invalid === 'id' ? 'invalid' : id(1);
      const result = mode === 'bulk' ? (await api.bulk([selected], 'publish')).error : await api.single(selected, 'publish');
      assert.ok(result);
      assert.deepEqual(api.writes, []);
    });
  }
  for (const change of ['published', 'draft', 'category']) {
    test(`${mode} guards a concurrent ${change} change`, async () => {
      const rows = [article(1)];
      const api = setup(rows, { onRead: live => {
        if (change === 'published') live[0].published_at = originalDate;
        if (change === 'draft') live[0].ever_published = false;
        if (change === 'category') live[0].category_id = null;
      } });
      const result = mode === 'bulk' ? (await api.bulk([id(1)], 'publish')).error : await api.single(id(1), 'publish');
      assert.match(result, /cambi/);
      assert.deepEqual(api.writes, []);
      assert.equal(rows[0].published_at, change === 'published' ? originalDate : null);
    });
  }
}

test('una noticia creada nunca publicada permite publicar por fila o en lote', async () => {
  for (const mode of ['bulk', 'single']) {
    const rows = [{ ...article(1), ever_published: false, editorial_state: 'despublicado' }];
    const api = setup(rows);
    if (mode === 'bulk') assert.equal((await api.bulk([id(1)], 'publish')).error, '');
    else assert.equal(await api.single(id(1), 'publish'), 'Estado actualizado.');
    assert.ok(rows[0].published_at);
    assert.equal(rows[0].ever_published, true);
  }
});
