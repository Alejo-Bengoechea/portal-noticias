import { useEffect, useRef, useState, type ReactNode } from 'react';
import { dateLabel, webUrl } from '@/lib/format';
import { ImportedRichBlock } from './imported-rich-block';
import type { JSONContent } from '@tiptap/react';
import { InlineNewsCategory, InlineNewsDate, InlineNewsList, InlineNewsTags, InlineNewsText, useInlineNewsEditing } from './inline-news-editor';
import { InlineRichText } from './inline-rich-text';
import { NewsSources } from './news-sources';
import { NewsVideo } from './news-video';
import { NewsTextImage } from './news-text-image';
import { NewsTable } from './news-table';
import { NewsBarChart } from './news-bar-chart';
import { ZoomableImage } from './zoomable-image';
import { imageTypes, uploadEditorialImage } from '@/lib/media-upload';

type Fields = Record<string, unknown>;
const fields = (value: unknown): Fields => value && typeof value === 'object' && !Array.isArray(value) ? value as Fields : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export { parseNewsImport as parseNewsPreview } from '@/lib/news-import';

function liveUrl(value: unknown) {
  const url = webUrl(value);
  return url && !new URL(url).hostname.endsWith('.invalid') ? url : undefined;
}

function SafeLink({ href, children }: { href: unknown; children: ReactNode }) {
  const editing = useInlineNewsEditing();
  const anchor = typeof href === 'string' && /^#[\w-]+$/.test(href) ? href : undefined;
  const target = anchor ?? liveUrl(href);
  if (editing && target && !anchor) return <span className="inline-news-link">{children}</span>;
  return target ? <a href={target} rel="noreferrer">{children}</a> : <>{children}</>;
}

function formatted(value: Fields, path: string[], textKey = 'texto') {
  return <FormattedNewsText value={value} path={path} textKey={textKey} />;
}

function FormattedNewsText({ value, path, textKey }: { value: Fields; path: string[]; textKey: string }) {
  const inline = useInlineNewsEditing();
  if (inline && path[0] === 'cuerpo') return <InlineRichText value={value} path={path} />;
  if (!Array.isArray(value.spans)) return <InlineNewsText path={[...path, textKey]} value={value.texto} label="Texto" multiline />;
  return value.spans.map((item, index) => {
    const span = fields(item);
    const marks = list(span.marcas);
    let content: ReactNode = <InlineNewsText path={[...path, 'spans', String(index), 'texto']} value={span.texto} label="Texto" multiline />;
    if (marks.includes('negrita')) content = <strong>{content}</strong>;
    if (marks.includes('cursiva')) content = <em>{content}</em>;
    if (marks.includes('subrayado')) content = <u>{content}</u>;
    return <SafeLink key={index} href={fields(span.enlace).href}>{content}</SafeLink>;
  });
}

type ChangeImage = (id: string, url: string) => void;

function PreviewImage({ resources, item, path, cover, onImageChange }: { resources: Fields; item: Fields; path: string[]; cover?: boolean; onImageChange?: ChangeImage }) {
  const id = text(item.recursoId);
  const resource = fields(resources[id]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController | null>(null);
  const currentChange = useRef(onImageChange);
  currentChange.current = onImageChange;
  useEffect(() => () => upload.current?.abort(), []);
  const url = liveUrl(resource.url);
  const alt = text(resource.alt);
  const focal = fields(item.puntoFocal);
  const inline = useInlineNewsEditing();
  const altInvalid = inline?.invalid.has([...path, 'alt'].join('.'));
  const imageInvalid = inline?.invalid.has(path.join('.'));
  const objectPosition = typeof focal.x === 'number' && typeof focal.y === 'number'
    ? `${Math.max(0, Math.min(1, focal.x)) * 100}% ${Math.max(0, Math.min(1, focal.y)) * 100}%` : undefined;
  return <figure className="preview-figure" data-invalid={imageInvalid || undefined}>
    {onImageChange && id && <div className="preview-image-controls">
      <button type="button" className="preview-image-edit" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? 'Subiendo…' : 'Subir foto'}</button>
      <button type="button" className="preview-image-edit" disabled={uploading} aria-expanded={editing} onClick={() => { setEditing(value => !value); setError(''); }}>Cambiar URL</button>
      <input autoComplete="off" ref={fileInput} type="file" hidden accept={imageTypes.join(',')} aria-label="Subir foto a la noticia" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        setError(''); setUploading(true);
        const controller = new AbortController(); upload.current = controller;
        try {
          const url = await uploadEditorialImage(file, controller.signal);
          if (!controller.signal.aborted) { currentChange.current?.(id, url); setEditing(false); }
        } catch (error) {
          if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
        } finally { if (!controller.signal.aborted) setUploading(false); }
      }} />
    </div>}
    {url ? (!inline ? <ZoomableImage src={url} alt={alt} className={cover ? 'cover' : undefined} objectPosition={objectPosition} /> : <img className={cover ? 'cover' : undefined} src={url} alt={alt} style={{ objectPosition }} loading="lazy" referrerPolicy="no-referrer" />)
      : <div className="preview-media" aria-label={alt || undefined}>Imagen de muestra{alt && <small>{alt}</small>}</div>}
    {editing && onImageChange && <form autoComplete="off" className="preview-image-form" onSubmit={event => {
      event.preventDefault();
      const next = webUrl(String(new FormData(event.currentTarget).get('image-url') ?? '').trim());
      if (!next) { setError('Introduce una URL HTTP o HTTPS válida.'); return; }
      onImageChange(id, next);
      setEditing(false);
    }}>
      <input autoComplete="off" name="image-url" aria-label="Nueva URL de la imagen" placeholder="https://…" defaultValue={text(resource.url)} required />
      <button type="submit">Aplicar URL</button>
    </form>}
    {error && <small className="preview-upload-error" role="alert">{error}</small>}
    {uploading && <span className="preview-upload-status" role="status">Guardando la imagen en Supabase Storage…</span>}
    {inline && id && <p className="preview-image-alt">Texto alternativo <InlineNewsText path={['recursos', id, 'alt']} value={resource.alt} label="Texto alternativo de la imagen" placeholder="Describe la imagen para accesibilidad" /></p>}
    {altInvalid && <small className="preview-upload-error" role="alert">Añade un texto alternativo a la imagen, para accesibilidad.</small>}
    {(item.pie || resource.credito || inline) ? <figcaption>
      <span><InlineNewsText path={[...path, 'pie']} value={item.pie} label="Pie de imagen" /></span>
      {(inline || item.pie && resource.credito) ? ' · ' : null}
      {(resource.credito || inline) ? <span data-edit-path={JSON.stringify(['recursos', id, 'credito'])}><InlineNewsText path={['recursos', id, 'credito']} value={resource.credito} label="Crédito de imagen" /></span> : null}
    </figcaption> : null}
  </figure>;
}

function EditorialNote({ note, path, titleKey = 'titulo', textKey = 'texto' }: { note: Fields; path: string[]; titleKey?: string; textKey?: string }) {
  const icon = note.icono === 'aviso' || note.icono === 'verificado' ? note.icono : 'info';
  const defaultColor = icon === 'aviso' ? 'ambar' : icon === 'verificado' ? 'verde' : 'rojo';
  const color = note.color === 'rojo' || note.color === 'ambar' || note.color === 'verde' ? note.color : defaultColor;
  return <aside className="preview-disclaimer" data-color={color}>
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {icon === 'aviso' ? <path d="M12 3 2 20h20L12 3zm0 6v4m0 3v.1" /> : <>
        <circle cx="12" cy="12" r="9" />
        <path d={icon === 'verificado' ? 'm8 12 3 3 5-6' : 'M12 11v5m0-8v.1'} />
      </>}
    </svg>
    <div><strong><InlineNewsText path={[...path, titleKey]} value={typeof note.titulo === 'string' ? note.titulo : 'Nota de la edición'} label="Título de la nota" /></strong><p>{formatted(note, path, textKey)}</p></div>
  </aside>;
}

function QuoteAttribution({ block, path }: { block: Fields; path: string[] }) {
  const inline = useInlineNewsEditing();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const portrait = liveUrl(block.retratoUrl);
  return <footer className="quote-attribution">
    {portrait && <img className="quote-portrait" src={portrait} alt={`Retrato de ${text(block.atribucion)}`} loading="lazy" referrerPolicy="no-referrer" />}
    <div><cite><InlineNewsText path={[...path, 'atribucion']} value={block.atribucion} label="Autoría de la cita" /></cite>
      {inline && <button type="button" className="quote-portrait-toggle" onClick={() => { setOpen(!open); setError(''); }}>{portrait ? 'Cambiar retrato' : '＋ Retrato opcional'}</button>}
    </div>
    {inline && open && <form autoComplete="off" className="quote-portrait-form" onSubmit={event => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get('portrait') ?? '').trim();
      const url = value ? webUrl(value) : '';
      if (value && !url) { setError('Introduce una URL HTTP o HTTPS válida.'); return; }
      inline.change([...path, 'retratoUrl'], url);
      setOpen(false);
    }}>
      <label>URL del retrato (opcional)<input autoComplete="off" type="url" name="portrait" maxLength={2048} defaultValue={text(block.retratoUrl)} placeholder="https://…" /></label>
      <button type="submit">Aplicar</button>
      {portrait && <button type="button" onClick={() => { inline.change([...path, 'retratoUrl'], ''); setOpen(false); }}>Quitar retrato</button>}
      {error && <small role="alert">{error}</small>}
    </form>}
  </footer>;
}

function renderBlock(block: Fields, index: number, resources: Fields, embeds: boolean, onImageChange?: ChangeImage): ReactNode {
  const title = text(block.titulo);
  const elements = list(block.elementos).map(fields);
  const path = ['cuerpo', String(index)];
  const editableTitle = <InlineNewsText path={[...path, 'titulo']} value={title} label="Título del componente" />;
  switch (block.tipo) {
    case 'tiptap': return <ImportedRichBlock content={fields(block.contenido) as JSONContent} path={path} />;
    case 'encabezado': {
      const Heading = block.nivel === 4 ? 'h4' : block.nivel === 3 ? 'h3' : 'h2';
      return <Heading>{formatted(block, path)}</Heading>;
    }
    case 'parrafo': return <p>{formatted(block, path)}</p>;
    case 'imagen': return <PreviewImage resources={resources} item={block} path={path} onImageChange={onImageChange} />;
    case 'texto_imagen': return <NewsTextImage block={block} path={path} text={formatted(block, path)} image={<PreviewImage resources={resources} item={block} path={path} onImageChange={onImageChange} />} />;
    case 'galeria': return <><h3>{editableTitle}</h3><div className="preview-gallery">{elements.map((item, i) => <PreviewImage key={i} resources={resources} item={item} path={[...path, 'elementos', String(i)]} onImageChange={onImageChange} />)}</div></>;
    case 'lista': {
      return <InlineNewsList ordered={Boolean(block.ordenada)} items={elements} path={[...path, 'elementos']}>
        {elements.map((item, i) => <li key={i}>{formatted(item, [...path, 'elementos', String(i)])}</li>)}
      </InlineNewsList>;
    }
    case 'cita': return <blockquote className="news-quote"><span className="news-quote-symbol" aria-hidden="true">“</span><p>{formatted(block, path)}</p><QuoteAttribution block={block} path={path} /></blockquote>;
    case 'pullquote': return <aside className="news-pullquote"><span className="pullquote-marker" aria-hidden="true">[ EXTRACTO ]</span><p>{formatted(block, path)}</p></aside>;
    case 'cifras': return <div className="preview-gallery">{elements.map((item, i) => {
      const itemPath = [...path, 'elementos', String(i)];
      return <div className="preview-note" key={i}><strong>
        <span data-edit-path={JSON.stringify([...itemPath, 'valor'])}><InlineNewsText path={[...itemPath, 'valor']} value={item.valor} label="Valor de la cifra" /></span>{' '}
        <span data-edit-path={JSON.stringify([...itemPath, 'unidad'])}><InlineNewsText path={[...itemPath, 'unidad']} value={item.unidad} label="Unidad" /></span>
      </strong><br /><InlineNewsText path={[...itemPath, 'etiqueta']} value={item.etiqueta} label="Descripción de la cifra" /></div>;
    })}</div>;
    case 'tabla': return <NewsTable block={block} path={path} />;
    case 'grafico': return <NewsBarChart block={block} path={path} />;
    case 'cronologia': return <><h3>Cronología</h3><ol>{list(block.eventos).map((event, i) => {
      const item = fields(event);
      const itemPath = [...path, 'eventos', String(i)];
      return <li key={i}><strong><InlineNewsText path={[...itemPath, 'fecha']} value={item.fecha} label="Fecha del acontecimiento" /> · <InlineNewsText path={[...itemPath, 'titulo']} value={item.titulo} label="Acontecimiento" /></strong><br /><InlineNewsText path={[...itemPath, 'texto']} value={item.texto} label="Descripción del acontecimiento" multiline /></li>;
    })}</ol></>;
    case 'video_externo': return <NewsVideo block={block} path={path} title={editableTitle} embeds={embeds} />;
    case 'audio': {
      const url = liveUrl(block.url);
      return <figure className="preview-note"><figcaption>{editableTitle}</figcaption>
        {url ? <audio controls preload="none" src={url} /> : <div className="preview-media">Audio de muestra</div>}
        {liveUrl(block.transcripcionUrl) && <SafeLink href={block.transcripcionUrl}>Transcripción</SafeLink>}
      </figure>;
    }
    case 'documento': return <p className="preview-note"><strong>Documento · </strong><SafeLink href={block.url}>{editableTitle}</SafeLink>{text(block.paginas) && <small> · {text(block.paginas)} páginas</small>}</p>;
    case 'embed': {
      const alternative = fields(block.alternativa);
      return <aside className="preview-note"><strong>{editableTitle}</strong><p><SafeLink href={alternative.url}><InlineNewsText path={[...path, 'alternativa', 'texto']} value={alternative.texto} label="Descripción del contenido externo" multiline /></SafeLink></p></aside>;
    }
    case 'encuesta': return <aside className="preview-note"><strong><InlineNewsText path={[...path, 'pregunta']} value={block.pregunta} label="Pregunta de la encuesta" /></strong><ul>{list(block.opciones).map((option, i) => <li key={i}><InlineNewsText path={[...path, 'opciones', String(i), 'texto']} value={fields(option).texto} label={`Respuesta ${i + 1}`} /></li>)}</ul></aside>;
    case 'nota_editorial': return <EditorialNote note={block} path={path} />;
    case 'correccion': return <aside className="preview-note"><strong><InlineNewsText path={[...path, 'titulo']} value={title || `Corrección · ${text(block.fecha).slice(0, 10)}`} label="Título de la corrección" /></strong><p>{formatted(block, path)}</p></aside>;
    default: return <p className="preview-note">Bloque sin vista previa: {text(block.tipo) || 'desconocido'}</p>;
  }
}

export function NewsPreview({ news, onImageChange, blockControls, blockInvalid, addComponent }: {
  news: Fields; onImageChange?: ChangeImage; blockControls?: (block: Fields, index: number) => ReactNode; blockInvalid?: (index: number) => boolean; addComponent?: ReactNode;
}) {
  const inline = useInlineNewsEditing();
  const metadata = fields(news.metadatos);
  const presentation = fields(news.presentacion);
  const resources = fields(news.recursos);
  const cover = inline ? { recursoId: 'imagen-portada', ...fields(news.portada) } : fields(news.portada);
  const dates = fields(news.fechas);
  const authors = list(news.autores).map(fields);
  const date = text(dates.publicacion);
  const updated = text(dates.actualizacion);
  const body = list(news.cuerpo).map(fields);
  const index = fields(presentation.indice);
  const headings = body.filter(block => block.tipo === 'encabezado' && text(block.id) && list(index.niveles).includes(block.nivel));
  return <div className="preview-layout">
    {index.mostrar && headings.length ? <nav className="preview-index" aria-label="Índice de la noticia">
      <strong>En esta noticia</strong>
      <ol>{headings.map((heading, i) => <li key={i}><SafeLink href={`#${text(heading.id)}`}>{text(heading.texto)}</SafeLink></li>)}</ol>
    </nav> : null}
    <article className="story preview-story">
    <section className={inline ? 'composer-news-section' : undefined} aria-label="Datos de la noticia">
    {inline && <p className="composer-section-label">01 · Datos de la noticia</p>}
    <p className="eyebrow accent"><InlineNewsCategory value={metadata.seccion} /></p>
    <h1><InlineNewsText path={['titular']} value={news.titular} label="Titular" /></h1>
    <p className="dek"><InlineNewsText path={['subtitulo']} value={news.subtitulo} label="Subtítulo de la noticia" placeholder="Haz clic para escribir el subtítulo" multiline /></p>
    <div className="byline">
      {presentation.mostrarFirma !== false && authors.length > 0 && <span>Por <strong>{authors.map((author, i) => <span key={i}>{i > 0 ? ', ' : ''}<InlineNewsText path={['autores', String(i), 'nombre']} value={author.nombre} label={`Firma ${i + 1}`} /></span>)}</strong></span>}
      {date && Number.isFinite(Date.parse(date)) && <time dateTime={date}>{dateLabel(date)}</time>}
      {presentation.mostrarFechaActualizacion !== false && updated && Number.isFinite(Date.parse(updated)) ? <span data-preview-date="actualizacion"><InlineNewsDate path={['fechas', 'actualizacion']} value={updated} prefix="Actualizado el " /></span> : null}
    </div>
    {presentation.mostrarAvisoFiccion !== false && text(metadata.avisoVisible) && <EditorialNote note={{ titulo: metadata.tituloAviso, texto: metadata.avisoVisible }} path={['metadatos']} titleKey="tituloAviso" textKey="avisoVisible" />}
    </section>
    {(inline || text(cover.recursoId)) && <section id="news-field-portada" className={inline ? 'composer-news-section' : undefined} aria-label="Portada">
      {inline && <p className="composer-section-label">02 · Portada</p>}
      <PreviewImage resources={resources} item={cover} path={['portada']} cover onImageChange={onImageChange} />
    </section>}
    <section className={inline ? 'composer-news-section' : undefined} aria-label="Cuerpo de la noticia">
    {inline && <p className="composer-section-label">03 · Cuerpo de la noticia</p>}
    <div className="rich">
      {text(news.entradilla) && <p className="preview-lede"><InlineNewsText path={['entradilla']} value={news.entradilla} label="Entradilla" multiline /></p>}
      {body.map((block, i) => block.tipo === 'fuentes' || block.tipo === 'relacionados' ? null :
        <div key={text(block.id) || i} className={blockControls ? 'composer-preview-block' : undefined} data-news-block={text(block.id) || String(i)} data-preview-block={i} data-invalid={blockInvalid?.(i) || undefined} id={text(block.id) || undefined}>
          {blockControls?.(block, i)}
          {renderBlock(block, i, resources, fields(presentation.embeds).habilitados !== false, onImageChange)}
        </div>)}
      {addComponent}
    </div>
    </section>
    <InlineNewsTags tags={list(metadata.etiquetas)} />
    <NewsSources body={body} />
    </article>
  </div>;
}

