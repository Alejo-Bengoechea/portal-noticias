const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function setup(authorized = true, valid = false) {
  let row;
  const query = { select() { return this; }, async single() { return { data: { id: 'saved' }, error: null }; } };
  const mocks = {
    'next/navigation': { redirect(path) { throw new Error('redirect:' + path); } },
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase': { adminClient: async () => authorized ? { from: () => ({ insert(value) { row = value; return query; } }) } : null },
    '@/lib/format': { webUrl: () => false, slugify: () => 'titulo' },
    '@/lib/articles': { getTerms: async () => [{ id: 'category', name: 'ECONOMÍA' }] },
    '@/lib/news-validation': { validateNewsDocument: () => valid ? [] : [{ message: 'Falta información' }] },
  };
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/../app/mesa-editorial-7k4n/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => { assert.ok(name in mocks, name); return mocks[name]; }, exports);
  return { save: async (intent, document) => {
    const form = new FormData(); form.set('intent', intent);
    form.set('document', JSON.stringify(document ?? { titular: '', autores: [], recursos: {}, cuerpo: [], metadatos: { seccion: 'Categoría eliminada', estado: 'despublicado' } }));
    return exports.saveNewsDocument('', form);
  }, row: () => row };
}
test('guardar borrador admite campos vacíos y categoría inexistente sin alterar el documento', async () => {
  const api = setup();
  await assert.rejects(api.save('borrador'), /redirect:/);
  const row = api.row();
  assert.equal(row.title, 'Borrador sin título');
  assert.equal(row.body.titular, '');
  assert.equal(row.body.metadatos.estado, 'borrador');
  assert.equal(row.category_id, null);
  assert.equal(row.published_at, null);
  assert.match(row.slug, /^borrador-/);
});
test('Crear sigue rechazando el contenido incompleto', async () => {
  const api = setup(); assert.match(await api.save('crear'), /Falta información/); assert.equal(api.row(), undefined);
});
test('un borrador requiere sesión autorizada', async () => {
  const api = setup(false); assert.match(await api.save('borrador'), /sesión/); assert.equal(api.row(), undefined);
});

test('Crear guarda una noticia preparada sin publicarla ni falsear el histórico', async () => {
  const api = setup(true, true);
  await assert.rejects(api.save('crear', { titular: 'Noticia lista', autores: [{ nombre: 'Alejo' }], cuerpo: [], recursos: {}, metadatos: { seccion: 'ECONOMÍA' } }), /redirect:/);
  assert.equal(api.row().body.metadatos.estado, 'despublicado');
  assert.equal(api.row().published_at, null);
  assert.equal(api.row().ever_published, undefined);
});
