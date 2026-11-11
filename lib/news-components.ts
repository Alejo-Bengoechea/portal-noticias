export type NewsDocument = Record<string, unknown>;
export type NewsBlock = Record<string, unknown>;
export type ImageResource = { tipo: string; url: string; alt: string; credito: string };
export type NewsResources = Record<string, ImageResource>;

export function newsTextLimit(path: string[], news: NewsDocument) {
  const key = path.at(-1);
  if (path[0] === 'titular') return 60;
  if (path[0] === 'subtitulo') return 240;
  if (path[0] === 'entradilla') return 600;
  if (path.includes('etiquetas')) return 40;
  if (path[0] === 'autores' || key === 'atribucion' || key === 'credito') return 100;
  if (key === 'pie') return 300;
  if (key === 'titulo' || key === 'tituloAviso') return 120;
  if (path[0] === 'cuerpo' && (news.cuerpo as NewsDocument[])?.[Number(path[1])]?.tipo === 'encabezado') return 120;
  return 3000;
}

export const componentTypes = [
  { type: 'encabezado', name: 'Subtítulo', symbol: 'H', group: 'Texto' },
  { type: 'parrafo', name: 'Texto', symbol: '¶', group: 'Texto' },
  { type: 'lista', name: 'Lista de viñetas', symbol: '≡', group: 'Texto' },
  { type: 'lista_numerada', name: 'Lista numerada', symbol: '1.', group: 'Texto' },
  { type: 'cita', name: 'Cita', symbol: '❝', group: 'Texto' },
  { type: 'pullquote', name: 'Frase destacada', symbol: '“', group: 'Texto' },
  { type: 'imagen', name: 'Imagen', symbol: '▧', group: 'Multimedia' },
  { type: 'texto_imagen', name: 'Texto e imagen', symbol: '▤', group: 'Multimedia' },
  { type: 'video_externo', name: 'Vídeo de YouTube', symbol: '▷', group: 'Multimedia' },
  { type: 'tabla', name: 'Tabla', symbol: '⊞', group: 'Datos' },
  { type: 'grafico', name: 'Gráfico de barras', symbol: '▥', group: 'Datos' },
  { type: 'nota_editorial', name: 'Nota editorial', symbol: 'ⓘ', group: 'Contexto' },
] as const;

// Los tipos retirados se conservan para leer documentos anteriores sin perder contenido.
type LegacyComponentType = 'galeria' | 'audio' | 'documento' | 'embed' | 'cifras' | 'cronologia' | 'encuesta' | 'correccion';
export type ComponentType = typeof componentTypes[number]['type'] | LegacyComponentType | 'fuentes';
export const emptyImage = (): ImageResource => ({ tipo: 'imagen', url: '', alt: '', credito: '' });

export function createNewsDocument(): NewsDocument {
  return {
    versionEsquema: '1.0.0',
    metadatos: { slug: '', estado: 'borrador', seccion: '', etiquetas: [] },
    titular: '', subtitulo: '', entradilla: '',
    autores: [{ nombre: 'Alejo Bengoechea' }],
    fechas: { publicacion: null, actualizacion: new Date().toISOString() },
    portada: null, recursos: {}, cuerpo: [],
    presentacion: { mostrarFirma: true, mostrarFechaActualizacion: true, indice: { mostrar: true, niveles: [2, 3] }, embeds: { habilitados: true } },
  };
}

export function createNewsBlock(type: ComponentType): { block: NewsBlock; resources: NewsResources } {
  const id = crypto.randomUUID();
  const imageId = `imagen-${id}`;
  const span = { texto: '', marcas: [] as string[], enlace: { href: '' } };
  const defaults: Record<ComponentType, NewsBlock> = {
    encabezado: { nivel: 2, texto: '' },
    parrafo: { spans: [span] },
    lista: { ordenada: false, elementos: [{ spans: [span] }] },
    lista_numerada: { ordenada: true, elementos: [{ spans: [span] }] },
    cita: { texto: '', atribucion: '', retratoUrl: '' },
    pullquote: { texto: '' },
    imagen: { recursoId: imageId, pie: '' },
    texto_imagen: { recursoId: imageId, pie: '', ladoTexto: 'izquierda', spans: [span] },
    galeria: { titulo: 'Galería', elementos: [{ recursoId: imageId, pie: '' }] },
    video_externo: { titulo: 'Vídeo', proveedor: 'youtube', url: '' },
    audio: { titulo: 'Audio', url: '', transcripcionUrl: '' },
    documento: { titulo: 'Documento', url: '', paginas: 1 },
    embed: { titulo: 'Contenido externo', alternativa: { texto: 'Descripción del contenido.', url: '' } },
    cifras: { elementos: [{ valor: 0, unidad: '', etiqueta: 'Descripción de la cifra' }] },
    tabla: { titulo: '', columnas: [{ clave: 'col-1', etiqueta: 'Columna 1' }, { clave: 'col-2', etiqueta: 'Columna 2' }], filas: [{ 'col-1': '', 'col-2': '' }] },
    grafico: { titulo: '', variante: 'barras', unidad: '', fuente: '', descripcionAccesible: '', datos: [] },
    cronologia: { eventos: [{ fecha: new Date().toISOString().slice(0, 10), titulo: 'Acontecimiento', texto: '' }] },
    encuesta: { pregunta: '¿Qué quieres preguntar?', modo: 'demostracion', activa: false, opciones: [{ id: crypto.randomUUID(), texto: 'Opción 1' }, { id: crypto.randomUUID(), texto: 'Opción 2' }] },
    nota_editorial: { titulo: 'Nota de la edición', texto: '', icono: 'info', color: 'rojo' },
    fuentes: { elementos: [{ id: crypto.randomUUID(), titulo: '', url: '' }] },
    correccion: { titulo: 'Corrección', fecha: new Date().toISOString().slice(0, 10), texto: '' },
  };
  return {
    block: { id, tipo: type === 'lista_numerada' ? 'lista' : type, ...structuredClone(defaults[type]) },
    resources: type === 'imagen' || type === 'galeria' || type === 'texto_imagen' ? { [imageId]: emptyImage() } : {},
  };
}

export function moveNewsBlock(body: NewsBlock[], index: number, offset: number) {
  const next = [...body];
  const target = index + offset;
  if (index < 0 || index >= body.length || target < 0 || target >= body.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
