'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { webUrl } from '@/lib/format';

type News = Record<string, unknown>;
type TextField = { path: string[]; value: string; numeric?: boolean };
const editable = new Set(['titular', 'subtitulo', 'entradilla', 'titulo', 'texto', 'nombre', 'seccion', 'avisoVisible', 'tituloAviso', 'pie', 'alt', 'credito', 'atribucion', 'pregunta', 'etiqueta', 'descripcionAccesible']);
const noteTitle = 'Nota de la edición';

function collectFields(value: unknown, path: string[] = []): TextField[] {
  if (path.length > 14) return [];
  if (path[0] === 'cuerpo' && path[2] === 'elementos' && path.length === 5) {
    if (path[4] === 'valor' && typeof value === 'number') return [{ path, value: String(value), numeric: true }];
    if ((path[4] === 'valor' || path[4] === 'unidad') && typeof value === 'string') return [{ path, value }];
  }
  if (typeof value === 'string') {
    return editable.has(path.at(-1) ?? '') || path.at(-2) === 'etiquetas' || path.join('.') === 'fechas.actualizacion' ? [{ path, value }] : [];
  }
  if (!value || typeof value !== 'object' || path[0] === 'seo') return [];
  const record = value as News;
  const result = Object.entries(record).flatMap(([key, child]) => collectFields(child, [...path, key]));
  if (path.length === 1 && path[0] === 'metadatos' && typeof record.avisoVisible === 'string' && typeof record.tituloAviso !== 'string') {
    result.push({ path: [...path, 'tituloAviso'], value: noteTitle });
  }
  if (record.tipo === 'nota_editorial' && typeof record.titulo !== 'string') {
    result.push({ path: [...path, 'titulo'], value: noteTitle });
  }
  return result;
}

function parentOf(news: News, field: TextField) {
  return field.path.slice(0, -1).reduce<News>((item, key) => item[key] as News, news);
}

export function PreviewTextEditor({ news, filename, onChange, children }: { news: News; filename: string; onChange: (news: News) => void; children: ReactNode }) {
  const fields = useMemo(() => collectFields(news), [news]);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const highlighted = useRef<Element | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const floatingEditor = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const field = fields.find(item => JSON.stringify(item.path) === selected);
  const isDate = field?.path.join('.') === 'fechas.actualizacion';
  const parent = field ? parentOf(news, field) : null;
  const link = parent?.enlace as News | undefined;
  const href = field?.path.at(-1) === 'texto' && typeof link?.href === 'string' ? link.href
    : (field?.path.at(-1) === 'titulo' || field?.path.at(-1) === 'texto') && typeof parent?.url === 'string' ? parent.url : null;
  const panelRoom = href === null ? 265 : 335;
  const [status, setStatus] = useState('');

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia('(max-width: 1023px)');
    const resize = () => {
      setMobile(query.matches);
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      floatingEditor.current?.style.setProperty('--editor-viewport-height', `${height}px`);
      floatingEditor.current?.style.setProperty('--editor-viewport-top', `${top}px`);
      setPosition(previous => previous ? {
        x: Math.max(left + 8, Math.min(left + width - 128, previous.x)),
        y: Math.max(top + 8, Math.min(top + height - 52, previous.y)),
      } : null);
    };
    resize();
    query.addEventListener('change', resize);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    return () => {
      query.removeEventListener('change', resize);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
    };
  }, []);

  useEffect(() => {
    const input = textarea.current;
    const form = input?.form;
    if (!input || !form) return;
    const resize = () => form.style.setProperty('--editor-text-width', `${input.offsetWidth}px`);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(input);
    return () => {
      observer.disconnect();
      form.style.removeProperty('--editor-text-width');
    };
  }, [open, selected]);

  function findText(event: MouseEvent) {
    if (!(event.target instanceof Element) || !event.target.closest('.preview-story')) return;
    const target = event.target;
    if (target.closest('button, input, textarea, select, .component-block-controls')) return;
    const explicit = target.closest<HTMLElement>('[data-edit-path]');
    if (explicit) {
      const directField = fields.find(item => JSON.stringify(item.path) === explicit.dataset.editPath);
      if (directField) return { field: directField, element: explicit };
    }
    const date = target.closest('[data-preview-date]');
    if (date) {
      const dateField = fields.find(item => item.path.join('.') === 'fechas.actualizacion');
      if (dateField) return { field: dateField, element: date };
    }
    const block = target.closest<HTMLElement>('[data-preview-block]')?.dataset.previewBlock;
    const candidates = fields.filter(({ path }) => block === undefined ? path[0] !== 'cuerpo' : path[0] === 'cuerpo' && path[1] === block);
    const node = document.caretPositionFromPoint?.(event.clientX, event.clientY)?.offsetNode ??
      document.caretRangeFromPoint?.(event.clientX, event.clientY)?.startContainer;
    const fragment = node?.nodeType === Node.TEXT_NODE && target.contains(node) ? node : null;
    const range = document.createRange();
    range.selectNodeContents(fragment ?? target);
    const overText = Array.from(range.getClientRects()).some(rect =>
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
    if (!overText) return;
    const exact = (value?: string) => value ? candidates.filter(item => item.value.trim() === value) : [];
    const matches = exact(fragment?.textContent?.trim());
    if (matches.length === 1) return { field: matches[0], element: fragment?.parentElement ?? target };
    const fallback = exact(target.textContent?.trim());
    if (fallback.length === 1) return { field: fallback[0], element: target };
  }

  function highlight(element: Element | null) {
    if (element === highlighted.current) return;
    highlighted.current?.removeAttribute('data-preview-hover');
    highlighted.current = element;
    element?.setAttribute('data-preview-hover', '');
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(news, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.json$/i, '') + '-editado.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <div className="preview-select-text" onPointerMove={event => highlight(findText(event)?.element ?? null)}
      onPointerLeave={() => highlight(null)} onClick={event => {
      const match = findText(event);
      if (!match) return;
      event.preventDefault();
      setSelected(JSON.stringify(match.field.path));
      setStatus('');
    }}>{children}</div>
    {mounted && createPortal(<div className="editorial-console editor-overlay">
    <div ref={floatingEditor} className="floating-text-editor" style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}>
      <button type="button" className="floating-edit-button" aria-disabled={!field} aria-expanded={open && !!field}
        onPointerDown={event => {
          if (event.button !== 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!start.moved && Math.hypot(dx, dy) < 5) return;
          start.moved = true;
          const viewport = window.visualViewport;
          const viewportLeft = viewport?.offsetLeft ?? 0;
          const viewportTop = viewport?.offsetTop ?? 0;
          const width = viewport?.width ?? window.innerWidth;
          const height = viewport?.height ?? window.innerHeight;
          setPosition({
            x: Math.max(viewportLeft + 8, Math.min(viewportLeft + width - event.currentTarget.offsetWidth - 8, start.left + dx)),
            y: Math.max(viewportTop + 8, Math.min(viewportTop + height - event.currentTarget.offsetHeight - (open && !mobile ? panelRoom : 8), start.top + dy)),
          });
        }}
        onPointerCancel={() => { drag.current = null; }}
        onClick={event => {
          const moved = drag.current?.moved;
          drag.current = null;
          if (!moved && field) {
            if (!mobile && !open && event.currentTarget.getBoundingClientRect().bottom > window.innerHeight - panelRoom) {
              const rect = event.currentTarget.getBoundingClientRect();
              setPosition({ x: rect.left, y: Math.max(8, window.innerHeight - panelRoom - rect.height) });
            }
            setOpen(value => !value);
          }
        }}>Editar texto</button>
    {open && field && <form autoComplete="off" className="stack panel floating-edit-form"
      style={!mobile && position ? ({
        right: position.x > window.innerWidth / 2 ? 0 : 'auto',
        left: position.x > window.innerWidth / 2 ? 'auto' : 0,
        '--editor-max-width': `${position.x > window.innerWidth / 2 ? position.x : window.innerWidth - position.x - 8}px`,
      } as CSSProperties) : undefined}
      onSubmit={event => {
      event.preventDefault();
      if (!field) return;
      const form = new FormData(event.currentTarget);
      const value = form.get('correction');
      if (typeof value !== 'string' || (field.path[0] === 'titular' && !value.trim())) {
        setStatus('El titular debe contener texto.');
        return;
      }
      const nextHref = String(form.get('href') ?? '').trim();
      if (href !== null && !webUrl(nextHref) && !/^#[\w-]+$/.test(nextHref)) {
        setStatus('Introduce una URL HTTP o HTTPS, o un ancla como #registro.');
        return;
      }
      const revised = structuredClone(news);
      const revisedParent = parentOf(revised, field);
      if (field.numeric && (!value.trim() || !Number.isFinite(Number(value)))) {
        setStatus('Introduce una cifra válida.');
        return;
      }
      revisedParent[field.path.at(-1)!] = isDate ? value + field.value.slice(10) : field.numeric ? Number(value) : value;
      if (href !== null) {
        const revisedLink = revisedParent.enlace as News | undefined;
        if (field.path.at(-1) === 'texto' && typeof revisedLink?.href === 'string') revisedLink.href = nextHref;
        else revisedParent.url = nextHref;
      }
      onChange(revised);
      setStatus('');
    }}>
      {isDate ? <input autoComplete="off" key={selected} name="correction" type="date" aria-label="Fecha de actualización" defaultValue={field.value.slice(0, 10)} required />
        : field.numeric ? <input autoComplete="off" key={selected} name="correction" type="number" step="any" aria-label="Cifra seleccionada" defaultValue={field.value} required />
        : <textarea autoComplete="off" ref={textarea} key={selected} name="correction" aria-label="Texto seleccionado" defaultValue={field.value} rows={4} />}
      {href !== null && <input autoComplete="off" key={`url-${selected}`} name="href" type="text" aria-label="URL del enlace" placeholder="URL del enlace" defaultValue={href} />}
      <div className="toolbar">
        <button type="submit">Aplicar</button>
        <button type="button" onClick={download}>Descargar nuevo JSON</button>
      </div>
      <p role="status">{status}</p>
    </form>}
    </div>
    </div>, document.body)}
  </>;
}
