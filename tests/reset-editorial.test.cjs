const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function setup({ authorized = true, error = null, inventoryError = null, paths = [], hidden = 0, storageError = null } = {}) {
  const calls = [];
  const remaining = new Set(paths);
  const client = {
    async rpc(name, args) {
      calls.push(args === undefined ? [name] : [name, args]);
      if (name === 'editorial_storage_count') return { data: remaining.size + hidden, error: inventoryError };
      return { error };
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'editorial');
      return { async remove(batch) {
        calls.push(['remove', batch]);
        if (!storageError) batch.forEach(path => remaining.delete(path));
        return { error: storageError };
      } };
    } },
  };
  const mocks = {
    '@/lib/supabase': { adminClient: async () => authorized ? client : null },
    '@/lib/media-library': { listEditorialAssets: async () => Array.from(remaining, path => ({ path })) },
    'next/cache': { revalidatePath() {} },
  };
  const codeText = ts.transpileModule(fs.readFileSync(__dirname + '/../app/mesa-editorial-7k4n/reset-actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; new Function('require', 'exports', codeText)(name => mocks[name], exports);
  return { calls, run: async (confirmation = 'LIMPIAR') => { const form = new FormData(); form.set('confirmation', confirmation); return exports.resetEditorialData('', form); } };
}
test('limpieza exige administrador y confirmación exacta antes de llamar a la base', async () => {
  const api = setup({ authorized: false }); assert.match(await api.run(), /autorizar/); assert.deepEqual(api.calls, []);
  const wrong = setup(); assert.match(await wrong.run('limpiar'), /Escribe/); assert.deepEqual(wrong.calls, []);
});
test('vacía las tablas antes de eliminar las fotos y verifica el inventario final', async () => {
  const api = setup({ paths: ['portada.jpg', '2026/foto.png'] });
  assert.equal(await api.run(), 'Contenido editorial eliminado.');
  assert.deepEqual(api.calls, [
    ['editorial_storage_count'],
    ['reset_editorial_test_data', { confirmation: 'LIMPIAR' }],
    ['remove', ['portada.jpg', '2026/foto.png']],
    ['editorial_storage_count'],
  ]);
});
test('si falta la función explica qué migración instalar sin intentar borrados parciales', async () => {
  const api = setup({ paths: ['foto.jpg'], error: { code: 'PGRST202' } });
  assert.match(await api.run(), /202611090004/);
  assert.equal(api.calls.some(([name]) => name === 'remove'), false);
});
test('un error de permisos no se presenta como éxito', async () => {
  const api = setup({ error: { code: '42501', message: 'permission denied for table editorial_page_views' } });
  const message = await api.run();
  assert.match(message, /42501/);
  assert.match(message, /permission denied/);
});

test('explica cómo corregir el bloqueo safeupdate sin omitirlo', async () => {
  const api = setup({ error: { code: '21000', message: 'DELETE requires a WHERE clause' } });
  assert.match(await api.run(), /202611090005_reset_safe_delete.sql/);
});

test('un inventario vacío por permisos bloquea la limpieza antes de tocar las tablas', async () => {
  const api = setup({ hidden: 1 });
  assert.match(await api.run(), /listado.*incompleto/);
  assert.deepEqual(api.calls, [['editorial_storage_count']]);
});

test('el fallo de Storage después del borrado SQL informa de limpieza parcial', async () => {
  const api = setup({ paths: ['foto.jpg'], storageError: { message: 'permission denied' } });
  assert.match(await api.run(), /La base de datos se vació, pero falló el borrado/);
});
