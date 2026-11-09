const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const ts = require('typescript');

// Load the real TypeScript validators (and their relative imports) without a build step.
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
const { parseNewsImport } = lib('news-import');
const { validateWorkspaceValues, validDay, periodDays, startWeek } = lib('editorial-workspace');

const example = readFileSync(join(__dirname, '..', 'noticia-james-webb.json'), 'utf8');
const news = (patch = {}) => JSON.stringify({ titular: 'Titular de prueba', cuerpo: [{ id: 'p1', tipo: 'parrafo', texto: 'Texto.' }], ...patch });
const rejects = (raw, message) => assert.throws(() => parseNewsImport(raw), message);

// ── Importador de noticias JSON (lib/news-import.ts) ──

test('el ejemplo documentado de James Webb es válido', () => {
  const parsed = parseNewsImport(example);
  assert.ok(parsed.titular);
  assert.ok(Array.isArray(parsed.cuerpo) && parsed.cuerpo.length > 0);
});

test('acepta BOM y completa la fecha de actualización', () => {
  const parsed = parseNewsImport('﻿' + news({ fechas: { publicacion: '2026-11-01T10:00:00Z' } }));
  assert.equal(parsed.fechas.actualizacion, '2026-11-01T10:00:00Z');
});

test('convierte una entradilla antigua en un párrafo movible sin chocar con IDs', () => {
  const parsed = parseNewsImport(news({ entradilla: 'Entrada.', cuerpo: [{ id: 'entradilla-importada', tipo: 'parrafo', texto: 'X' }] }));
  assert.equal(parsed.entradilla, undefined);
  assert.equal(parsed.cuerpo[0].tipo, 'parrafo');
  assert.equal(parsed.cuerpo[0].spans[0].texto, 'Entrada.');
  assert.notEqual(parsed.cuerpo[0].id, 'entradilla-importada');
});

test('rechaza JSON roto o con raíz incorrecta', () => {
  rejects('{ "titular": ', /no es JSON válido/);
  rejects('[]', /raíz/);
});

test('rechaza sin truncar los textos fuera de límite', () => {
  rejects(news({ titular: 'x'.repeat(61) }), /titular: máximo 60/);
  rejects(news({ subtitulo: 'x'.repeat(241) }), /subtitulo: máximo 240/);
  rejects(news({ cuerpo: [{ id: 'p1', tipo: 'parrafo', texto: 'x'.repeat(3001) }] }), /máximo 3000/);
});

test('rechaza enlaces que no son HTTP/HTTPS o llevan credenciales', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,hola', 'https://usuario:clave@ejemplo.com'])
    rejects(news({ cuerpo: [{ id: 'p1', tipo: 'parrafo', spans: [{ texto: 'a', enlace: { href } }] }] }), /URL HTTP o HTTPS/);
  assert.ok(parseNewsImport(news({ cuerpo: [{ id: 'p1', tipo: 'parrafo', spans: [{ texto: 'a', enlace: { href: '#seccion-1' } }] }] })));
});

test('solo acepta vídeos de YouTube', () => {
  rejects(news({ cuerpo: [{ id: 'v1', tipo: 'video_externo', url: 'https://vimeo.com/123' }] }), /YouTube/);
  assert.ok(parseNewsImport(news({ cuerpo: [{ id: 'v1', tipo: 'video_externo', url: 'https://youtu.be/dQw4w9WgXcQ' }] })));
});

test('valida IDs de bloque, tipos y referencias a imágenes', () => {
  rejects(news({ cuerpo: [{ id: 'a', tipo: 'parrafo', texto: '1' }, { id: 'a', tipo: 'parrafo', texto: '2' }] }), /identificador único/);
  rejects(news({ cuerpo: [{ id: 'a', tipo: 'html', texto: '<script>' }] }), /tipo de componente desconocido/);
  rejects(news({ cuerpo: [{ id: 'i', tipo: 'imagen', recursoId: 'falta' }] }), /no corresponde a ninguna imagen/);
  rejects(news({ cuerpo: Array.from({ length: 501 }, (_, i) => ({ id: `p${i}`, tipo: 'parrafo', texto: 'x' })) }), /máximo 500/);
});

test('etiquetas: máximo tres y sin duplicados (ignorando mayúsculas)', () => {
  rejects(news({ metadatos: { etiquetas: ['a', 'b', 'c', 'd'] } }), /máximo 3 etiquetas/);
  rejects(news({ metadatos: { etiquetas: ['Clima', 'clima'] } }), /repetidas/);
});

test('tablas y gráficos respetan sus límites', () => {
  const columnas = Array.from({ length: 6 }, (_, i) => ({ clave: `c${i}`, etiqueta: 'C' }));
  rejects(news({ cuerpo: [{ id: 't', tipo: 'tabla', columnas, filas: [{}] }] }), /de 1 a 5 columnas/);
  rejects(news({ cuerpo: [{ id: 'g', tipo: 'grafico', datos: [{ x: 'a', y: Infinity }] }] }), /número/);
});

test('documentos Tiptap: rechaza nodos y marcas desconocidos', () => {
  const tiptap = content => news({ cuerpo: [{ id: 'tt', tipo: 'tiptap', contenido: { type: 'doc', content } }] });
  assert.ok(parseNewsImport(tiptap([{ type: 'paragraph', content: [{ type: 'text', text: 'Hola', marks: [{ type: 'bold' }] }] }])));
  rejects(tiptap([{ type: 'iframe' }]), /nodo Tiptap desconocido/);
  rejects(tiptap([{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:x' } }] }] }]), /URL HTTP o HTTPS/);
});

// ── Organización, ideas y fuentes (lib/editorial-workspace.ts) ──

const plan = patch => ({ title: 'Plan', scheduled_on: '2026-11-09', state: 'pendiente', priority: 'normal', notes: '', ...patch });
const source = patch => ({ name: 'Fuente', kind: 'persona', organization: '', url: '', email: '', phone: '', notes: '', favorite: false, ...patch });

test('planificación: recorta textos y valida fecha, estado y prioridad', () => {
  assert.deepEqual(validateWorkspaceValues('plans', plan({ title: '  Plan  ' })), plan());
  assert.throws(() => validateWorkspaceValues('plans', plan({ scheduled_on: '2026-02-30' })), /fecha válida/);
  assert.throws(() => validateWorkspaceValues('plans', plan({ state: 'publicada' })), /estado/);
  assert.throws(() => validateWorkspaceValues('plans', plan({ priority: 'urgente' })), /prioridad/);
  assert.throws(() => validateWorkspaceValues('plans', plan({ notes: 'x'.repeat(3001) })), /3000/);
  assert.throws(() => validateWorkspaceValues('plans', plan({ title: '   ' })), /título/);
});

test('ideas: ignora campos ajenos', () => {
  assert.deepEqual(validateWorkspaceValues('ideas', { title: 'Idea', notes: 'n', id: 'x', admin: true }), { title: 'Idea', notes: 'n' });
});

test('fuentes: URL, correo, teléfono y favorita', () => {
  assert.equal(validateWorkspaceValues('sources', source({ url: 'https://ejemplo.com' })).url, 'https://ejemplo.com/');
  for (const url of ['javascript:alert(1)', 'ftp://ejemplo.com', 'https://u:p@ejemplo.com'])
    assert.throws(() => validateWorkspaceValues('sources', source({ url })), /URL HTTP o HTTPS/);
  assert.throws(() => validateWorkspaceValues('sources', source({ email: 'sin-arroba' })), /correo/);
  assert.throws(() => validateWorkspaceValues('sources', source({ phone: '612<script>' })), /teléfono/);
  assert.throws(() => validateWorkspaceValues('sources', source({ favorite: 'true' })), /favorita/);
  assert.throws(() => validateWorkspaceValues('sources', source({ kind: 'anonimo' })), /tipo de fuente/);
});

test('calendario: bisiestos, semanas de lunes a domingo y cambio de año', () => {
  assert.equal(validDay('2028-02-29'), true);
  assert.equal(validDay('2027-02-29'), false);
  assert.equal(startWeek('2027-01-01'), '2026-12-28');
  assert.deepEqual(periodDays('2026-12-31', 'semana'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(periodDays('2028-02-10', 'mes').length, 29);
  assert.equal(periodDays('2026-03-29', 'mes').length, 31);
});
