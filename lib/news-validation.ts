import type { NewsDocument } from './news-components';
import { webUrl, youtubeId } from './format';

export type NewsValidationIssue = { path: string[]; message: string };

const object = (value: unknown): value is NewsDocument => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const richText = (block: NewsDocument): string => Array.isArray(block.spans)
  ? (block.spans as NewsDocument[]).map(span => text(object(span) ? span.texto : '')).join('')
  : text(block.texto);

/**
 * Comprueba la noticia que se edita en el creador (no el JSON importado: ese usa
 * `parseNewsImport`, más estricto y con los mismos mensajes para no romper esa validación).
 * Devuelve todos los problemas encontrados, cada uno con la ruta exacta del campo, para
 * poder marcar varios campos a la vez en pantalla.
 */
export function validateNewsDocument(
  news: NewsDocument,
  categories: { name: string }[],
  { requireCategory = true, requireCover = true }: { requireCategory?: boolean; requireCover?: boolean } = {},
): NewsValidationIssue[] {
  const issues: NewsValidationIssue[] = [];
  const fail = (path: string[], message: string) => issues.push({ path, message });

  const titular = text(news.titular).trim();
  if (!titular) fail(['titular'], 'El titular no puede estar vacío.');
  else if (titular.length > 60) fail(['titular'], 'El titular supera los 60 caracteres.');

  const subtitulo = text(news.subtitulo);
  if (subtitulo.length > 240) fail(['subtitulo'], 'El subtítulo supera los 240 caracteres.');

  const metadata = object(news.metadatos) ? news.metadatos : {};
  const seccion = text(metadata.seccion).trim();
  if (requireCategory) {
    if (!seccion) fail(['metadatos', 'seccion'], 'Selecciona una categoría para la noticia.');
    else if (!categories.some(category => category.name.toLocaleUpperCase('es') === seccion.toLocaleUpperCase('es'))) {
      fail(['metadatos', 'seccion'], 'La categoría seleccionada ya no existe. Elige otra.');
    }
  }

  const tags = list(metadata.etiquetas).map(text);
  if (tags.length > 3) fail(['metadatos', 'etiquetas'], 'Una noticia admite como máximo 3 etiquetas.');
  tags.forEach((tag, i) => { if (!tag.trim()) fail(['metadatos', 'etiquetas', String(i)], 'Una etiqueta no puede estar vacía.'); });
  const normalized = tags.map(tag => tag.trim().normalize('NFKC').toLocaleLowerCase('es'));
  if (new Set(normalized).size !== normalized.length) fail(['metadatos', 'etiquetas'], 'Hay etiquetas repetidas.');

  const authors = list(news.autores).map((author, i) => ({ author: object(author) ? author : {}, i }));
  if (!authors.length) fail(['autores'], 'La noticia necesita al menos una firma.');
  authors.forEach(({ author, i }) => { if (!text(author.nombre).trim()) fail(['autores', String(i), 'nombre'], 'La firma no puede estar vacía.'); });

  const resources = object(news.recursos) ? news.recursos : {};
  function requireImage(path: string[], item: NewsDocument, { altRequired = true }: { altRequired?: boolean } = {}) {
    const id = text(item.recursoId);
    const resource = object(resources[id]) ? resources[id] as NewsDocument : {};
    if (!id || !webUrl(resource.url)) fail(path, 'Falta subir o enlazar una imagen.');
    else if (altRequired && !text(resource.alt).trim()) fail([...path, 'alt'], 'Añade un texto alternativo a la imagen, para accesibilidad.');
  }

  if (requireCover) {
    if (!object(news.portada)) fail(['portada'], 'La noticia necesita una imagen de portada.');
    else requireImage(['portada'], news.portada as NewsDocument);
  } else if (object(news.portada)) {
    requireImage(['portada'], news.portada as NewsDocument);
  }

  const body = list(news.cuerpo).map(block => object(block) ? block : {});
  if (!body.length) fail(['cuerpo'], 'Añade al menos un componente al cuerpo de la noticia.');

  body.forEach((block, i) => {
    const path = ['cuerpo', String(i)];
    switch (block.tipo) {
      case 'encabezado':
        if (![2, 3, 4].includes(Number(block.nivel))) fail([...path, 'nivel'], 'El nivel del subtítulo no es válido.');
        if (!text(block.texto).trim()) fail([...path, 'texto'], 'El subtítulo no puede estar vacío.');
        break;
      case 'parrafo':
        if (!richText(block).trim()) fail([...path, 'spans', '0', 'texto'], 'El párrafo no puede estar vacío.');
        break;
      case 'cita':
        if (!text(block.texto).trim()) fail([...path, 'texto'], 'La cita no puede estar vacía.');
        break;
      case 'pullquote':
        if (!text(block.texto).trim()) fail([...path, 'texto'], 'La frase destacada no puede estar vacía.');
        break;
      case 'nota_editorial':
        if (!text(block.texto).trim()) fail([...path, 'texto'], 'La nota editorial no puede estar vacía.');
        break;
      case 'lista': {
        const items = list(block.elementos).map(item => object(item) ? item : {});
        if (!items.length) fail([...path, 'elementos'], 'La lista necesita al menos un elemento.');
        items.forEach((item, j) => { if (!richText(item).trim()) fail([...path, 'elementos', String(j), 'spans', '0', 'texto'], 'Un elemento de la lista está vacío.'); });
        break;
      }
      case 'imagen':
        requireImage(path, block);
        break;
      case 'texto_imagen':
        requireImage(path, block);
        if (!richText(block).trim()) fail([...path, 'spans', '0', 'texto'], 'El texto que acompaña a la imagen no puede estar vacío.');
        if (!['izquierda', 'derecha'].includes(String(block.ladoTexto))) fail([...path, 'ladoTexto'], 'Elige en qué lado va el texto.');
        break;
      case 'video_externo':
        if (!youtubeId(block.url)) fail([...path, 'url'], 'Introduce un enlace válido de YouTube.');
        break;
      case 'tabla': {
        const columns = list(block.columnas).map(column => object(column) ? column : {});
        columns.forEach((column, j) => { if (!text(column.etiqueta).trim()) fail([...path, 'columnas', String(j), 'etiqueta'], 'Las columnas de la tabla necesitan un nombre.'); });
        break;
      }
      case 'grafico':
        if (block.muestra === true) fail([...path, 'muestra'], 'Sustituye los datos de ejemplo del gráfico por los de la noticia.');
        if (!text(block.titulo).trim()) fail([...path, 'titulo'], 'El gráfico necesita un título.');
        if (!Array.isArray(block.datos) || !block.datos.length || block.datos.length > 30 || block.datos.some(point => !object(point) || !text(point.x).trim() || typeof point.y !== 'number' || !Number.isFinite(point.y) || Math.abs(point.y) > 1e12)) {
          fail([...path, 'datos'], 'Añade entre 1 y 30 datos al gráfico, con nombre y número válido.');
        }
        break;
      case 'fuentes': {
        const items = list(block.elementos).map(item => object(item) ? item : {});
        items.forEach((item, j) => { if (!text(item.titulo).trim()) fail([...path, 'elementos', String(j), 'titulo'], 'Falta el nombre de esta fuente.'); });
        break;
      }
      default:
        break;
    }
  });

  return issues;
}
