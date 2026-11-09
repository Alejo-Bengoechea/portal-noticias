import { componentTypes, type NewsDocument } from './news-components';
import { webUrl, youtubeId } from './format';

const object = (value: unknown): value is NewsDocument => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const supported = new Set<string>([...componentTypes.map(item => item.type), 'fuentes', 'tiptap', 'galeria', 'audio', 'documento', 'embed', 'cifras', 'cronologia', 'encuesta', 'correccion']);
const fail = (message: string): never => { throw new Error(message); };
export function normalizeNewsDocument(news: NewsDocument): NewsDocument {
  const dates = object(news.fechas) ? news.fechas : {};
  const valid = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  news.fechas = { ...dates, actualizacion: valid(dates.actualizacion) ? dates.actualizacion : valid(dates.publicacion) ? dates.publicacion : new Date().toISOString() };
  if (typeof news.entradilla === 'string' && news.entradilla.trim() && Array.isArray(news.cuerpo)) {
    const ids = new Set(news.cuerpo.map(block => object(block) ? block.id : ''));
    let id = 'entradilla-importada'; while (ids.has(id)) id += '-1';
    news.cuerpo = [{ id, tipo: 'parrafo', spans: [{ texto: news.entradilla, marcas: [] }] }, ...news.cuerpo];
    delete news.entradilla;
  }
  return news;
}
function string(value: unknown, path: string, max = 3000, required = false) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || (required && !value.trim())) fail(`${path}: debe ser un texto${required ? ' no vacío' : ''}.`);
  if ((value as string).length > max) fail(`${path}: máximo ${max} caracteres.`);
}
function url(value: unknown, path: string) {
  if (value === undefined || value === '') return;
  if (!webUrl(value)) fail(`${path}: utiliza una URL HTTP o HTTPS válida.`);
}
function rich(block: NewsDocument, path: string) {
  string(block.texto, `${path}.texto`);
  if (block.spans !== undefined) {
    if (!Array.isArray(block.spans)) fail(`${path}.spans: debe ser una lista de fragmentos.`);
    let length = 0;
    for (const [i, span] of (block.spans as unknown[]).entries()) {
      if (!object(span)) fail(`${path}.spans[${i}]: fragmento no válido.`);
      const fragment = span as NewsDocument;
      string(fragment.texto, `${path}.spans[${i}].texto`, 3000, false);
      if (typeof fragment.texto !== 'string') fail(`${path}.spans[${i}]: falta texto.`);
      length += (fragment.texto as string).length;
      if (fragment.marcas !== undefined && (!Array.isArray(fragment.marcas) || fragment.marcas.some(mark => !['negrita', 'cursiva', 'subrayado'].includes(mark)))) fail(`${path}: marcas admitidas: negrita, cursiva y subrayado.`);
      if (fragment.enlace !== undefined) {
        if (!object(fragment.enlace)) fail(`${path}: enlace debe ser un objeto con href.`);
        const href = (fragment.enlace as NewsDocument).href;
        if (!(typeof href === 'string' && /^#[\w-]+$/.test(href))) url(href, `${path}.enlace.href`);
      }
    }
    if (length > 3000) fail(`${path}: máximo 3000 caracteres por componente.`);
  }
}

function tiptap(value: unknown, path: string, depth = 0) {
  if (depth > 40 || !object(value) || typeof value.type !== 'string') fail(`${path}: nodo Tiptap no válido o demasiado anidado.`);
  const node = value as NewsDocument;
  if (!['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock', 'hardBreak', 'horizontalRule', 'image', 'youtube'].includes(String(node.type))) fail(`${path}: nodo Tiptap desconocido «${node.type}».`);
  if (node.type === 'text') string(node.text, `${path}.text`, 3000, true);
  if (node.attrs !== undefined && !object(node.attrs)) fail(`${path}.attrs: debe ser un objeto.`);
  if (node.marks !== undefined && (!Array.isArray(node.marks) || node.marks.some(mark => !object(mark) || !['bold', 'italic', 'underline', 'strike', 'code', 'link'].includes(String(mark.type))))) fail(`${path}.marks: formato Tiptap no admitido.`);
  const attrs = object(node.attrs) ? node.attrs : {};
  if (node.type === 'image') url(attrs.src, `${path}.attrs.src`);
  if (node.type === 'youtube' && attrs.src && !youtubeId(attrs.src)) fail(`${path}.attrs.src: enlace de YouTube no válido.`);
  if (Array.isArray(node.marks)) for (const mark of node.marks) if (object(mark) && mark.type === 'link') url(object(mark.attrs) ? mark.attrs.href : undefined, `${path}.marks.link.href`);
  if (node.content !== undefined) {
    if (!Array.isArray(node.content) || node.content.length > 1000) fail(`${path}.content: debe ser una lista de hasta 1000 nodos.`);
    (node.content as unknown[]).forEach((child, i) => tiptap(child, `${path}.content[${i}]`, depth + 1));
  }
}

export function parseNewsImport(raw: string): NewsDocument {
  let parsed: unknown;
  try { parsed = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { return fail('El archivo no es JSON válido. Revisa las comas, comillas y llaves.'); }
  if (!object(parsed)) return fail('La raíz del JSON debe ser un objeto de noticia.');
  const news = parsed;
  string(news.titular, 'titular', 60, true); string(news.subtitulo, 'subtitulo', 240); string(news.entradilla, 'entradilla', 600);
  if (!Array.isArray(news.cuerpo)) return fail('cuerpo: debe ser una lista de componentes.');
  if (news.cuerpo.length > 500) return fail('cuerpo: máximo 500 componentes.');
  for (const key of ['metadatos', 'fechas', 'presentacion', 'recursos']) if (news[key] != null && !object(news[key])) fail(`${key}: debe ser un objeto.`);
  const metadata = (news.metadatos ?? {}) as NewsDocument;
  const presentation = (news.presentacion ?? {}) as NewsDocument;
  for (const key of ['mostrarFirma', 'mostrarFechaActualizacion', 'mostrarAvisoFiccion']) if (presentation[key] !== undefined && typeof presentation[key] !== 'boolean') fail(`presentacion.${key}: debe ser true o false.`);
  for (const key of ['indice', 'embeds']) if (presentation[key] !== undefined && !object(presentation[key])) fail(`presentacion.${key}: debe ser un objeto.`);
  if (object(presentation.indice) && presentation.indice.niveles !== undefined && (!Array.isArray(presentation.indice.niveles) || presentation.indice.niveles.some(level => ![2, 3, 4].includes(level)))) fail('presentacion.indice.niveles: utiliza una lista con 2, 3 o 4.');
  const tags = metadata.etiquetas;
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.length > 3) fail('La noticia puede tener como máximo 3 etiquetas en una lista.');
    (tags as unknown[]).forEach((tag, i) => string(tag, `etiquetas[${i}]`, 40, true));
    if (new Set((tags as string[]).map(tag => tag.trim().normalize('NFKC').toLocaleLowerCase('es'))).size !== (tags as unknown[]).length) fail('Las etiquetas no pueden estar repetidas.');
  }
  string(metadata.seccion, 'metadatos.seccion', 120);
  if (news.autores !== undefined) {
    if (!Array.isArray(news.autores)) fail('autores: debe ser una lista.');
    (news.autores as unknown[]).forEach((author, i) => { if (!object(author)) fail(`autores[${i}]: debe ser un objeto.`); string((author as NewsDocument).nombre, `autores[${i}].nombre`, 100, true); });
  }
  const resources = (news.recursos ?? {}) as NewsDocument;
  for (const [key, resource] of Object.entries(resources)) {
    if (!object(resource)) fail(`recursos.${key}: debe ser un objeto.`);
    const image = resource as NewsDocument;
    url(image.url, `recursos.${key}.url`); string(image.alt, `recursos.${key}.alt`); string(image.credito, `recursos.${key}.credito`, 100);
  }
  function imageReference(value: unknown, path: string) {
    if (!object(value)) return fail(`${path}: debe ser un objeto.`);
    if (typeof value.recursoId !== 'string' || !Object.hasOwn(resources, value.recursoId)) fail(`${path}.recursoId: no corresponde a ninguna imagen de recursos.`);
    const image = resources[value.recursoId as string] as NewsDocument;
    if (image.tipo !== undefined && image.tipo !== 'imagen') fail(`${path}.recursoId: el recurso debe ser una imagen.`);
    string(value.pie, `${path}.pie`, 300);
  }
  if (news.portada != null) imageReference(news.portada, 'portada');
  const ids = new Set<string>();
  for (const [i, value] of news.cuerpo.entries()) {
    const path = `cuerpo[${i}]`;
    if (!object(value)) fail(`${path}: debe ser un componente.`);
    const block = value as NewsDocument;
    if (typeof block.tipo !== 'string' || !supported.has(block.tipo)) fail(`${path}: tipo de componente desconocido «${String(block.tipo ?? '')}».`);
    if (typeof block.id !== 'string' || !block.id.trim() || ids.has(block.id)) fail(`${path}.id: debe ser un identificador único no vacío.`);
    ids.add(block.id as string);
    rich(block, path); string(block.titulo, `${path}.titulo`, 120);
    if (['parrafo', 'encabezado', 'cita', 'pullquote', 'texto_imagen', 'nota_editorial'].includes(String(block.tipo)) && typeof block.texto !== 'string' && !Array.isArray(block.spans)) fail(`${path}: falta texto o una lista de spans.`);
    if (block.tipo === 'encabezado' && ![2, 3, 4].includes(Number(block.nivel))) fail(`${path}.nivel: utiliza 2, 3 o 4.`);
    if (block.tipo === 'encabezado') string(block.texto, `${path}.texto`, 120);
    if (block.tipo === 'cita') { string(block.atribucion, `${path}.atribucion`, 100); url(block.retratoUrl, `${path}.retratoUrl`); }
    if (block.tipo === 'lista_numerada') { block.tipo = 'lista'; block.ordenada = true; }
    if (block.tipo === 'imagen' || block.tipo === 'texto_imagen') imageReference(block, path);
    if (block.tipo === 'texto_imagen' && !['izquierda', 'derecha'].includes(String(block.ladoTexto))) fail(`${path}.ladoTexto: utiliza izquierda o derecha.`);
    if (block.tipo === 'video_externo' && block.url && !youtubeId(block.url)) fail(`${path}.url: introduce un enlace válido de YouTube.`);
    if (['lista', 'lista_numerada', 'fuentes', 'galeria'].includes(String(block.tipo))) {
      if (!Array.isArray(block.elementos)) fail(`${path}.elementos: debe ser una lista.`);
      (block.elementos as unknown[]).forEach((item, j) => {
        if (!object(item)) fail(`${path}.elementos[${j}]: debe ser un objeto.`);
        rich(item as NewsDocument, `${path}.elementos[${j}]`);
        if (block.tipo === 'galeria') imageReference(item, `${path}.elementos[${j}]`);
        if (block.tipo === 'fuentes') { string((item as NewsDocument).titulo, `${path}.elementos[${j}].titulo`, 120, true); url((item as NewsDocument).url, `${path}.elementos[${j}].url`); }
      });
    }
    if (block.tipo === 'tabla') {
      if (!Array.isArray(block.columnas) || !block.columnas.length || block.columnas.length > 5 || !Array.isArray(block.filas) || !block.filas.length || block.filas.length > 8) fail(`${path}: la tabla admite de 1 a 5 columnas y de 1 a 8 filas.`);
      const keys = new Set<string>();
      for (const column of block.columnas as unknown[]) {
        if (!object(column) || typeof column.clave !== 'string' || !column.clave || keys.has(column.clave)) fail(`${path}: cada columna necesita una clave única.`);
        keys.add((column as NewsDocument).clave as string); string((column as NewsDocument).etiqueta, `${path}.columnas.etiqueta`, 120);
      }
      for (const row of block.filas as unknown[]) {
        if (!object(row)) fail(`${path}.filas: cada fila debe ser un objeto.`);
        for (const key of keys) if ((row as NewsDocument)[key] !== undefined && !['string', 'number'].includes(typeof (row as NewsDocument)[key])) fail(`${path}: las celdas solo admiten texto o números.`);
      }
    }
    if (block.tipo === 'grafico') {
      if (!Array.isArray(block.datos) || !block.datos.length || block.datos.length > 30) fail(`${path}.datos: el gráfico admite entre 1 y 30 valores.`);
      for (const point of block.datos as unknown[]) if (!object(point) || typeof point.x !== 'string' || typeof point.y !== 'number' || !Number.isFinite(point.y) || Math.abs(point.y) > 1e12) fail(`${path}.datos: cada valor necesita x (texto) e y (número válido).`);
    }
    if (block.tipo === 'tiptap' && (!object(block.contenido) || block.contenido.type !== 'doc' || !Array.isArray(block.contenido.content))) fail(`${path}.contenido: documento Tiptap no válido.`);
    if (block.tipo === 'tiptap') tiptap(block.contenido, `${path}.contenido`);
    if (block.tipo === 'nota_editorial') {
      if (block.icono !== undefined && !['info', 'aviso', 'verificado'].includes(String(block.icono))) fail(`${path}.icono: utiliza info, aviso o verificado.`);
      if (block.color !== undefined && !['rojo', 'ambar', 'verde'].includes(String(block.color))) fail(`${path}.color: utiliza rojo, ambar o verde.`);
    }
  }
  const dates = (news.fechas ?? {}) as NewsDocument;
  for (const [key, value] of Object.entries(dates)) if (value != null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) fail(`fechas.${key}: fecha no válida.`);
  return normalizeNewsDocument(news);
}
