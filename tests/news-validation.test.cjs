const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const ts = require('typescript');

// Load the real TypeScript validator (and its relative imports) without a build step.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name.startsWith('./'), `Import no previsto en el test: ${name}`);
    return load(join(dirname(file), `${name}.ts`));
  }, module, module.exports);
  return module.exports;
}
const lib = name => load(join(__dirname, '..', 'lib', `${name}.ts`));
const { createNewsDocument, createNewsBlock } = lib('news-components');
const { validateNewsDocument } = lib('news-validation');

const categories = [{ name: 'ESPAÑA' }, { name: 'ECONOMÍA' }];
const paths = issues => issues.map(issue => issue.path.join('.'));

function minimalValid() {
  const news = createNewsDocument();
  news.titular = 'Un titular válido';
  news.metadatos.seccion = 'ESPAÑA';
  news.portada = { recursoId: 'imagen-portada', pie: '' };
  news.recursos['imagen-portada'] = { tipo: 'imagen', url: 'https://ejemplo.com/foto.jpg', alt: 'Descripción de la foto', credito: '' };
  const parrafo = createNewsBlock('parrafo');
  parrafo.block.spans[0].texto = 'Contenido real del párrafo.';
  news.cuerpo = [parrafo.block];
  return news;
}

test('una noticia recién creada (vacía) falla en los campos obligatorios para Crear', () => {
  const issues = validateNewsDocument(createNewsDocument(), categories, { requireCategory: true, requireCover: true });
  const found = paths(issues);
  assert.ok(found.includes('titular'));
  assert.ok(found.includes('metadatos.seccion'));
  assert.ok(found.includes('portada'));
  assert.ok(found.includes('cuerpo'));
});

test('una noticia completa y válida no genera errores al Crear', () => {
  assert.deepEqual(validateNewsDocument(minimalValid(), categories, { requireCategory: true, requireCover: true }), []);
});

test('guardar como borrador no exige categoría ni portada', () => {
  const news = minimalValid();
  news.metadatos.seccion = '';
  news.portada = null;
  const issues = validateNewsDocument(news, categories, { requireCategory: false, requireCover: false });
  assert.deepEqual(issues, []);
});

test('rechaza una categoría que ya no existe en la lista real', () => {
  const news = minimalValid();
  news.metadatos.seccion = 'CATEGORÍA BORRADA';
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('metadatos.seccion'));
});

test('exige texto alternativo en la portada y en las imágenes del cuerpo', () => {
  const news = minimalValid();
  news.recursos['imagen-portada'].alt = '';
  const imagen = createNewsBlock('imagen');
  news.recursos[imagen.block.recursoId] = { tipo: 'imagen', url: 'https://ejemplo.com/otra.jpg', alt: '' };
  news.cuerpo.push(imagen.block);
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('portada.alt'));
  assert.ok(paths(issues).some(path => path.endsWith('.alt')));
});

test('un párrafo o una lista vacíos quedan señalados', () => {
  const news = minimalValid();
  const vacio = createNewsBlock('parrafo');
  news.cuerpo.push(vacio.block);
  const lista = createNewsBlock('lista');
  news.cuerpo.push(lista.block);
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes(`cuerpo.1.spans.0.texto`));
  assert.ok(paths(issues).some(path => path.startsWith('cuerpo.2.elementos')));
});

test('un vídeo sin enlace de YouTube válido queda señalado', () => {
  const news = minimalValid();
  const video = createNewsBlock('video_externo');
  news.cuerpo.push(video.block);
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('cuerpo.1.url'));
});

test('un gráfico con datos de ejemplo sin sustituir queda señalado', () => {
  const news = minimalValid();
  const grafico = createNewsBlock('grafico');
  news.cuerpo.push(grafico.block);
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('cuerpo.1.muestra'));
  grafico.block.muestra = false;
  const fixed = validateNewsDocument({ ...news, cuerpo: [news.cuerpo[0], grafico.block] }, categories, { requireCategory: true, requireCover: true });
  assert.ok(!paths(fixed).includes('cuerpo.1.muestra'));
});

test('una fuente sin nombre queda señalada', () => {
  const news = minimalValid();
  const fuentes = createNewsBlock('fuentes');
  news.cuerpo.push(fuentes.block);
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('cuerpo.1.elementos.0.titulo'));
});

test('etiquetas vacías o repetidas quedan señaladas', () => {
  const news = minimalValid();
  news.metadatos.etiquetas = ['Clima', 'clima', ''];
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('metadatos.etiquetas.2'));
  assert.ok(paths(issues).includes('metadatos.etiquetas'));
});

test('una firma sin nombre queda señalada', () => {
  const news = minimalValid();
  news.autores = [{ nombre: '  ' }];
  const issues = validateNewsDocument(news, categories, { requireCategory: true, requireCover: true });
  assert.ok(paths(issues).includes('autores.0.nombre'));
});
