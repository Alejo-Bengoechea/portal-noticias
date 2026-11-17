const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

// Carga un módulo TypeScript del proyecto resolviendo sus imports `@/lib/...` con esta misma función.
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const code = ts.transpileModule(readFileSync(join(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  cache.set(relative, module.exports);
  new Function('require', 'module', 'exports', code)(name => {
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name === 'next/server' || name.startsWith('@supabase/')) return {};
    throw new Error(`Import no previsto: ${name}`);
  }, module, module.exports);
  cache.set(relative, module.exports);
  return module.exports;
}

const source = load('lib/traffic-source.ts');
const audience = load('lib/audience.ts');

test('no cuenta localhost y respeta la lista de dominios', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'portal.localhost', 'mi-app.test']) assert.equal(source.isTrackedHost(host), false, host);
  assert.equal(source.isTrackedHost('alejo.chatgpt.site'), true);
  assert.equal(source.isTrackedHost('alejo.chatgpt.site', 'midominio.es, www.midominio.es'), false);
  assert.equal(source.isTrackedHost('www.midominio.es', 'midominio.es, www.midominio.es'), true);
});

test('descarta robots y peticiones sin navegador', () => {
  assert.equal(source.isBotAgent('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(source.isBotAgent(null), true);
  assert.equal(source.isBotAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'), false);
});

test('clasifica el canal de llegada', () => {
  const own = 'alejo.chatgpt.site';
  const cases = {
    '': 'directo', 'www.google.es': 'buscadores', 'duckduckgo.com': 'buscadores', 'search.brave.com': 'buscadores',
    'com.google.android.googlequicksearchbox': 'buscadores', 't.co': 'redes', 'x.com': 'redes', 'l.instagram.com': 'redes',
    'lm.facebook.com': 'redes', 'com.instagram.android': 'redes', 'mail.google.com': 'otras', 'com.google.android.gm': 'otras',
    'elpais.com': 'otras', 'host con espacios': 'otras',
  };
  for (const [ref, expected] of Object.entries(cases)) assert.equal(source.classifyEntry(ref, own), expected, ref || '(vacío)');
  assert.equal(source.classifyEntry('www.alejo.chatgpt.site', own), null, 'navegación interna');
});

test('calcula los días de Madrid sin saltos por el cambio de hora', () => {
  // 00:30 en Madrid del 27 de octubre es todavía 26 de octubre en UTC.
  const days = audience.audienceDays(7, new Date('2026-10-26T23:30:00Z'));
  assert.deepEqual(days.map(day => day.key), ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']);
  assert.equal(audience.audienceDays(30, new Date('2026-03-01T12:00:00Z'))[0].key, '2026-01-31');
  assert.equal(audience.parsePeriod('30'), 30);
  assert.equal(audience.parsePeriod('99'), 7);
});

test('agrupa vistas y canales por día', () => {
  const days = [{ key: '2026-11-15', label: '' }, { key: '2026-11-16', label: '' }];
  const { byKey, total } = audience.buildSeries([
    { day: '2026-11-15', page_key: 'article:a', views: '3' },
    { day: '2026-11-16', page_key: 'article:a', views: 2 },
    { day: '2026-11-16', page_key: '/', views: 5 },
    { day: '2026-11-01', page_key: '/', views: 50 },
  ], days);
  assert.deepEqual(byKey.get('article:a'), [3, 2]);
  assert.deepEqual(total, [3, 7]);
  const { visits, sources } = audience.buildSources([
    { day: '2026-11-15', source: 'redes', visits: 4 },
    { day: '2026-11-16', source: 'directo', visits: 1 },
    { day: '2026-11-16', source: 'inventado', visits: 9 },
  ], days);
  assert.deepEqual(visits, [4, 1]);
  assert.equal(sources[0].key, 'redes');
  assert.equal(sources.reduce((total, item) => total + item.visits, 0), 5);
});

test('indica la migración pendiente si faltan las tablas', async () => {
  const missing = { data: null, error: { code: 'PGRST205' } };
  const query = { select: () => query, gte: () => query, order: () => query, range: async () => missing, limit: async () => missing, then: resolve => resolve(missing) };
  const data = await audience.getAudience({ from: () => query }, 7, new Date('2026-11-17T10:00:00Z'));
  assert.equal(data.status, 'missing');
  assert.equal(data.articles.length, 0);
  assert.deepEqual(data.portalViews, [0, 0, 0, 0, 0, 0, 0]);
});
