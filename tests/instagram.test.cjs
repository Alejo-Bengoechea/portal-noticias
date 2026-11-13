const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const code = ts.transpileModule(readFileSync(join(__dirname, '../lib/instagram.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(env, respond) {
  const module = { exports: {} };
  const calls = [];
  new Function('require', 'module', 'exports', 'process', 'fetch', code)(
    name => assert.equal(name, 'server-only'), module, module.exports, { env },
    async (url, options) => {
      assert.equal(url.origin, 'https://graph.facebook.com');
      assert.equal(url.searchParams.has('access_token'), false);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.redirect, 'error');
      calls.push(url);
      return respond(url);
    },
  );
  return { connect: module.exports.connectInstagram, calls };
}

test('sin token indica configuración pendiente y no consulta Meta', async () => {
  const { connect, calls } = load({}, () => assert.fail('Consulta inesperada'));
  assert.deepEqual(await connect(), { status: 'setup' });
  assert.equal(calls.length, 0);
});

test('encuentra la cuenta correcta en páginas sucesivas sin seguir URLs de Meta', async () => {
  const { connect, calls } = load({ INSTAGRAM_ACCESS_TOKEN: 'test-token' }, url => {
    if (url.pathname.endsWith('/assigned_instagram_accounts')) {
      return url.searchParams.get('after') === 'next'
        ? Response.json({ data: [{ id: '42', username: 'alejobengo' }] })
        : Response.json({ data: [{ id: '10', username: 'otro' }], paging: { cursors: { after: 'next' } } });
    }
    return Response.json({ id: '42', username: 'alejobengo', followers_count: 2019 });
  });
  const result = await connect();
  assert.equal(result.status, 'connected');
  assert.equal(result.client.profile.followers_count, 2019);
  assert.equal(JSON.stringify(result).includes('test-token'), false);
  assert.equal(calls.length, 3);
});

test('acepta un identificador explícito y verifica que pertenezca a la cuenta prevista', async () => {
  const { connect, calls } = load({ INSTAGRAM_ACCESS_TOKEN: 'test-token', INSTAGRAM_ACCOUNT_ID: '42' },
    () => Response.json({ id: '42', username: 'otra' }));
  assert.deepEqual(await connect(), { status: 'wrong-account' });
  assert.equal(calls[0].pathname, '/v26.0/42');
});

test('distingue un token revocado de un permiso faltante y oculta el mensaje de Meta', async () => {
  for (const [code, status] of [[190, 'token'], [10, 'permission']]) {
    const { connect } = load({ INSTAGRAM_ACCESS_TOKEN: 'test-token', INSTAGRAM_ACCOUNT_ID: '42' },
      () => Response.json({ error: { code, message: 'private detail' } }, { status: 400 }));
    assert.deepEqual(await connect(), { status, code });
  }
});

test('conserva métricas válidas si una métrica del grupo falla y distingue cero de ausencia', async () => {
  const { connect } = load({ INSTAGRAM_ACCESS_TOKEN: 'test-token', INSTAGRAM_ACCOUNT_ID: '42' }, url => {
    if (!url.pathname.endsWith('/insights')) return Response.json({ id: '42', username: 'alejobengo' });
    const metric = url.searchParams.get('metric');
    if (metric.includes(',')) return Response.json({ error: { code: 100 } }, { status: 400 });
    if (url.searchParams.get('metric_type') === 'time_series') {
      return Response.json({ data: [{ name: metric, values: [{ value: 0, end_time: '2026-11-10T00:00:00Z' }] }] });
    }
    if (metric === 'views' && !url.searchParams.has('breakdown')) {
      return Response.json({ data: [{ name: 'views', total_value: { value: 0 } }] });
    }
    return Response.json({ data: [] });
  });
  const result = await connect();
  const overview = await result.client.overview(7, new Date('2026-11-13T15:00:00Z'));
  assert.equal(overview.totalStatus.state, 'ok');
  assert.equal(overview.totals.views, 0);
  assert.equal(overview.totals.reach, null);
  assert.equal(overview.trend.rows[0].value, 0);
  assert.equal(overview.until - overview.since, 7 * 86400);
});

const account = { INSTAGRAM_ACCESS_TOKEN: 'test-token', INSTAGRAM_ACCOUNT_ID: '42' };
const profile = { id: '42', username: 'alejobengo' };
const limit = () => Response.json({ error: { code: 80002 } }, {
  status: 400, headers: { 'X-Business-Use-Case-Usage': JSON.stringify({ '42': [{ estimated_time_to_regain_access: 7 }] }) },
});

test('los bloques conservan su estado, incluido un límite a mitad del reintento', async () => {
  const { connect } = load(account, url => {
    if (!url.pathname.endsWith('/insights')) return Response.json(profile);
    const metric = url.searchParams.get('metric');
    if (metric.includes(',')) return Response.json({ error: { code: 100 } }, { status: 400 });
    if (metric === 'views' && !url.searchParams.has('breakdown')) return Response.json({ data: [{ name: 'views', total_value: { value: 31 } }] });
    if (metric === 'reach' && url.searchParams.get('metric_type') === 'total_value' && !url.searchParams.has('breakdown')) return Response.json({ data: [] });
    return limit();
  });
  const { client } = await connect();
  const overview = await client.overview(7);
  assert.deepEqual(overview.totalStatus, { state: 'partial', reason: 'limit', waitMinutes: 7 });
  assert.equal(overview.totals.views, 31);
  assert.equal(overview.totals.accounts_engaged, null);
  for (const block of [overview.trend, overview.growth, overview.viewsByAudience, overview.reachByFormat, ...await client.audience('follower')]) {
    assert.deepEqual(block.status, { state: 'error', reason: 'limit', waitMinutes: 7 });
  }
});

test('reintenta un 500 una vez, reutiliza lecturas y omite métricas retiradas', async () => {
  let tries = 0;
  const { connect, calls } = load(account, url => {
    if (!url.pathname.endsWith('/insights')) return ++tries === 1 ? new Response(null, { status: 500 }) : Response.json(profile);
    return Response.json({ data: [] });
  });
  const { client } = await connect();
  const today = new Date('2026-11-13T15:00:00Z');
  await client.overview(7, today);
  const second = await connect();
  await second.client.overview(7, today);
  assert.equal(tries, 2);
  assert.equal(calls.length, 7);
  assert.equal(calls.some(url => /profile_views|reached_audience_demographics/.test(url.href)), false);
});

test('distingue pocos espectadores de un permiso real y aísla las métricas opcionales de Reels', async () => {
  const { connect, calls } = load(account, url => {
    if (url.pathname.endsWith('/42')) return Response.json(profile);
    const metric = url.searchParams.get('metric');
    if (url.pathname.endsWith('/57/insights')) return Response.json({ error: { code: 10, message: 'Not enough viewers' } }, { status: 400 });
    if (metric.includes('crossposted_views')) return Response.json({ error: { code: 100 } }, { status: 400 });
    return Response.json({ data: [] });
  });
  const { client } = await connect();
  const story = await client.mediaInsights({ id: '57' }, true);
  assert.equal(story.blocks[0].status.state, 'insufficient');
  const before = calls.length;
  const reel = await client.mediaInsights({ id: '58', media_product_type: 'REELS' }, false);
  assert.equal(calls.length - before, 3);
  assert.equal(reel.blocks[2].status.state, 'unsupported');
});

test('renderiza estados parciales, desgloses traducidos y fechas de Madrid', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const path = '../app/mesa-editorial-7k4n/redes-sociales/instagram/page.tsx';
  const pageCode = ts.transpileModule(readFileSync(join(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const ok = { state: 'ok' };
  const empty = { state: 'empty' };
  const block = (rows, status = ok) => ({ rows, status });
  const renderClient = {
    profile: {},
    overview: async () => ({
      since: 1792108800, until: 1794528000, totals: { views: 100, reach: null, replies: null },
      totalStatus: { state: 'partial', reason: 'limit', waitMinutes: 7 },
      trend: block([], { state: 'error', reason: 'limit', waitMinutes: 7 }),
      growth: block([{label:'FOLLOWER',value:31},{label:'NON_FOLLOWER',value:12}]),
      viewsByAudience: block([], empty), reachByFormat: block([{label:'CAROUSEL_CONTAINER',value:8}]),
    }),
    audience: async () => ['age','gender','city','country'].map(dimension => ({
      dimension, ...block([], { state: 'error', reason: 'limit' }),
    })),
    media: async () => ({ ok: true, data: { data: [{ id: '57', timestamp: '2026-11-12T23:30:00+0000' }] } }),
    mediaInsights: async () => ({
      blocks:[{ status:{state:'insufficient'}, metrics:{views:null} }],
      navigation: block([{label:'tap_forward',value:8},{label:'TAP_BACK',value:2}]),
    }),
  };
  const mocks = {
    'next/link': { default: 'a' }, 'next/cache': {}, 'next/navigation': {},
    '@/lib/supabase': { adminClient: async () => true },
    '@/lib/instagram': { connectInstagram: async () => ({status:'connected',client:renderClient}) },
    '@/lib/format': { webUrl: () => undefined },
    '@/components/social-dashboard.module.css': { default: {} }, './instagram.module.css': { default: {} },
  };
  const module = { exports: {} };
  new Function('require','module','exports','React',pageCode)(name => mocks[name],module,module.exports,React);
  async function resolve(element) {
    if (!React.isValidElement(element)) return element;
    if (typeof element.type === 'function') return resolve(await element.type(element.props));
    const children = React.Children.toArray(element.props.children);
    return children.length ? React.cloneElement(element, {}, ...await Promise.all(children.map(resolve))) : element;
  }
  async function render(params) {
    return renderToStaticMarkup(await resolve(await module.exports.default({searchParams:Promise.resolve(params)})));
  }
  const overview = await render({});
  assert.match(overview, /Nuevos seguidores<\/dt><dd>31/);
  assert.match(overview, /Bajas<\/dt><dd>12/);
  assert.match(overview, /Saldo neto<\/dt><dd>19/);
  assert.match(overview, /Carruseles<\/dt><dd>8/);
  assert.match(overview, /Datos parciales/);
  assert.match(overview, /Meta no devolvió este dato/);
  assert.match(overview, /Consultado el/);
  assert.equal((await render({vista:'audiencia'})).match(/Meta limitó temporalmente las consultas/g).length,4);
  const story = await render({vista:'contenido',tipo:'historias',pieza:'57'});
  assert.match(story, /13 nov/);
  assert.match(story, /espectadores suficientes/);
  assert.match(story, /No disponible para cuentas de Europa/);
  assert.match(story, /Avanzar<\/dt>/);
  assert.match(story, /Volver<\/dt>/);
});
