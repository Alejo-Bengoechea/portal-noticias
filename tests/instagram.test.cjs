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
  assert.equal(overview.error, null);
  assert.equal(overview.totals.views, 0);
  assert.equal(overview.totals.reach, undefined);
  assert.equal(overview.trend[0].value, 0);
  assert.equal(overview.until - overview.since, 7 * 86400);
});
