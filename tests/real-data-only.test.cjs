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
  assert.equal(await api.getHomeCover(), null);
  assert.equal(await api.getArticle('las-ciudades-que-queremos'), null);
});

test('la imagen y la categoría de una tarjeta abren su noticia', () => {
  const cards = load('components/cards.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'), 'next/link': { default: 'a' },
    '@/lib/format': { webUrl: value => value },
  });
  const markup = renderToStaticMarkup(React.createElement(cards.Card, {
    article: { slug: 'ejemplo', title: 'Noticia', subtitle: '', cover_url: 'https://ejemplo.com/foto.jpg', cover_alt: 'Foto', published_at: null },
    category: { name: 'CULTURA', slug: 'cultura' },
  }));
  assert.match(markup, /href="\/noticia\/ejemplo"[^>]*><img/);
  assert.match(markup, /href="\/noticia\/ejemplo"[^>]*>CULTURA<\/a>/);
});

test('el inicio pagina sin repetir la portada y cada categoría conserva todas sus noticias publicadas', async () => {
  const categories = [
    { id: 'esp', slug: 'espana', name: 'ESPAÑA' },
    { id: 'tec', slug: 'tecnologia', name: 'TECNOLOGÍA' },
  ];
  const rows = Array.from({ length: 16 }, (_, i) => ({
    id: String(i), slug: `noticia-${i}`, title: `Titular ${i}`, subtitle: '', cover_url: null,
    category_id: categories[i % 2].id, featured: i === 14,
    published_at: new Date(Date.UTC(2026, 9, 31 - i)).toISOString(),
    created_at: new Date(Date.UTC(2026, 9, 31 - i)).toISOString(),
  }));
  rows.push(
    { ...rows[0], id: 'draft', slug: 'privada', published_at: null, featured: true },
    { ...rows[0], id: 'future', slug: 'futura', published_at: '2999-01-01T00:00:00.000Z', featured: true },
  );
  let ranking = { error: { code: 'PGRST202' } };
  const client = { async rpc(name, args) { assert.equal(name, 'popular_articles'); assert.equal(args.days, 30); return ranking; }, from(table) {
    let result = [...(table === 'categories' ? categories : rows)];
    const order = [];
    let start = 0;
    let end;
    function data() {
      return result.sort((a, b) => {
        for (const [key, direction] of order) {
          if (a[key] !== b[key]) return a[key] < b[key] ? -direction : direction;
        }
        return 0;
      }).slice(start, end);
    }
    return {
      select() { return this; },
      eq(key, value) { result = result.filter(row => row[key] === value); return this; },
      in(key, values) { result = result.filter(row => values.includes(row[key])); return this; },
      neq(key, value) { result = result.filter(row => row[key] !== value); return this; },
      lte(key, value) { result = result.filter(row => row[key] !== null && row[key] <= value); return this; },
      gte(key, value) { result = result.filter(row => row[key] != null && row[key] >= value); return this; },
      order(key, { ascending = true } = {}) { order.push([key, ascending ? 1 : -1]); return this; },
      range(first, last) { start = first; end = last + 1; return this; },
      limit(size) { end = size; return this; },
      async maybeSingle() { return { data: data()[0] ?? null, error: null }; },
      then(resolve, reject) { return Promise.resolve({ data: data(), error: null }).then(resolve, reject); },
    };
  } };
  const articles = load('lib/articles.ts', { react: { cache: fn => fn }, './supabase': { publicClient: () => client } });
  const jsx = { 'react/jsx-runtime': require('react/jsx-runtime'), 'next/link': { default: 'a' } };
  const cards = load('components/cards.tsx', { ...jsx, '@/lib/format': { dateLabel: value => value, webUrl: () => null } });
  const carousel = load('components/cover-carousel.tsx', { react: React, 'react-dom': require('react-dom'), 'react/jsx-runtime': require('react/jsx-runtime') });
  const subscribe = load('components/subscribe-section.tsx', jsx);
  const imports = { ...jsx, '@/lib/articles': articles, '@/components/cards': cards, '@/components/cover-carousel': carousel, '@/components/subscribe-section': subscribe };
  const { default: Home } = load('app/(public)/page.tsx', imports);
  const { default: Category } = load('app/(public)/categoria/[slug]/page.tsx', {
    ...imports, 'next/navigation': { notFound: () => assert.fail('La categoría existe') },
  });
  const home = async pagina => renderToStaticMarkup(await Home({ searchParams: Promise.resolve({ pagina }) }));
  const first = await home('1');
  const second = await home('2');
  const titles = markup => Array.from(markup.matchAll(/<h[123](?: class="[^"]*")?><a href="\/noticia\/([^"]+)">/g), match => match[1]);
  assert.deepEqual(titles(first), ['noticia-14', ...rows.slice(0, 4).map(row => row.slug), ...rows.slice(0, 3).map(row => row.slug), ...rows.slice(4, 14).map(row => row.slug), 'noticia-15']);
  assert.deepEqual(titles(second), titles(first));
  ranking = { data: [{ id: '9' }, { id: '2' }] };
  const ranked = titles(await home('1'));
  assert.deepEqual(ranked.slice(5, 8), ['noticia-9', 'noticia-2', 'noticia-0']);
  ranking = { error: { code: 'PGRST202' } };
  assert.doesNotMatch(first, /Siguiente/);
  assert.doesNotMatch(first, /popularidad pendiente de medir/);

  const category = renderToStaticMarkup(await Category({ params: Promise.resolve({ slug: 'espana' }), searchParams: Promise.resolve({}) }));
  assert.deepEqual(titles(category), rows.slice(0, 16).filter(row => row.category_id === 'esp').map(row => row.slug));
  assert.doesNotMatch(category, /carrusel/);
  rows[4].category_cover_position = 1;
  rows[2].category_cover_position = 2;
  const rotating = renderToStaticMarkup(await Category({ params: Promise.resolve({ slug: 'espana' }), searchParams: Promise.resolve({}) }));
  assert.match(rotating, /aria-roledescription="carrusel"/);
  assert.deepEqual(titles(rotating), ['noticia-4', 'noticia-2', ...rows.slice(0, 16).filter(row => row.category_id === 'esp' && ![2, 4].includes(Number(row.id))).map(row => row.slug)]);
  delete rows[4].category_cover_position;
  delete rows[2].category_cover_position;

  rows[14].published_at = null;
  assert.equal((await articles.getHomeCover()).id, rows[0].id);
  rows.splice(1);
  const single = await home('1');
  assert.deepEqual(titles(single), ['noticia-0']);
  assert.doesNotMatch(single, /No hay publicaciones/);
  rows.length = 0;
  assert.match(await home('1'), /No hay publicaciones/);
});

test('las portadas de inicio validan la lista, comprueban que estén publicadas y no necesitan migraciones', async () => {
  let client;
  const calls = [];
  let published = 2;
  const chain = name => ({ ops: [name], then(resolve) { calls.push(this.ops); resolve({ data: undefined, error: null }); },
    select() { this.ops.push('select'); return this; }, update(v) { this.ops.push(['update', v]); return this; },
    eq(...a) { this.ops.push(['eq', ...a]); return this; }, in(...a) { this.ops.push(['in', ...a]); return this; },
    not(...a) { this.ops.push(['not', ...a]); return this; },
    lte() { calls.push(this.ops); return Promise.resolve({ data: Array.from({ length: published }, (_, i) => ({ id: i })), error: null }); } });
  const { setHomeCovers } = load('app/mesa-editorial-7k4n/actions.ts', {
    'next/navigation': {}, 'next/cache': { revalidatePath: (...args) => calls.push(args) },
    '@/lib/supabase': { adminClient: async () => client }, '@/lib/format': {},
    '@/lib/articles': {}, '@/lib/news-validation': {},
  });
  const ids = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
  assert.match(await setHomeCovers(ids), /autorizar/);
  client = { from: chain };
  assert.match(await setHomeCovers([...ids, ids[0], ids[1]]), /hasta tres/);
  assert.match(await setHomeCovers([ids[0], ids[0]]), /hasta tres/);
  assert.match(await setHomeCovers(['no-es-uuid']), /hasta tres/);
  assert.equal(calls.length, 0);
  published = 1;
  assert.match(await setHomeCovers(ids), /publicadas/);
  published = 2;
  calls.length = 0;
  assert.equal(await setHomeCovers(ids), '');
  assert.equal(calls.at(-1)[0], '/');
  assert.ok(calls.some(op => JSON.stringify(op).includes('"featured":true') && JSON.stringify(op).includes('"in"')));
  calls.length = 0;
  assert.equal(await setHomeCovers([]), '');
  assert.ok(calls.some(op => JSON.stringify(op).includes('"featured":false')));
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

test('las portadas por categoría validan la lista y delegan el cambio atómico a Supabase', async () => {
  let client;
  const calls = [];
  const { setCategoryCovers } = load('app/mesa-editorial-7k4n/actions.ts', {
    'next/navigation': {}, 'next/cache': { revalidatePath: (...args) => calls.push(args) },
    '@/lib/supabase': { adminClient: async () => client }, '@/lib/format': {},
    '@/lib/articles': {}, '@/lib/news-validation': {},
  });
  const category = '11111111-1111-4111-8111-111111111111';
  const ids = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
  assert.match(await setCategoryCovers(category, [ids[0]]), /autorizar/);
  let response = { data: true };
  client = { async rpc(name, args) { calls.push([name, args]); return response; } };
  assert.match(await setCategoryCovers('otra', [ids[0]]), /autorizar/);
  assert.match(await setCategoryCovers(category, [...ids, ids[0]]), /hasta tres/);
  assert.match(await setCategoryCovers(category, [ids[0], ids[0]]), /hasta tres/);
  assert.match(await setCategoryCovers(category, ['no-es-uuid']), /hasta tres/);
  assert.equal(calls.length, 0);
  response = { error: { code: 'PGRST202' } };
  assert.match(await setCategoryCovers(category, ids), /202611150001_category_covers.sql/);
  response = { data: false };
  assert.match(await setCategoryCovers(category, ids), /publicadas de esta categoría/);
  response = { data: true };
  assert.equal(await setCategoryCovers(category, []), '');
  assert.deepEqual(calls.at(-2), ['set_category_covers', { category, article_ids: [] }]);
  assert.deepEqual(calls.at(-1), ['/', 'layout']);
});
