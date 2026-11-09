'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { NewsDocument } from '@/lib/news-components';
import { dateLabel } from '@/lib/format';
import { inlineSpansFromDOM } from '@/lib/inline-format';

type Path = string[];
type Editing = { news: NewsDocument; categories: { id: string; name: string }[]; change: (path: Path, value: unknown) => void };
const InlineEditing = createContext<Editing | null>(null);
export const useInlineNewsEditing = () => useContext(InlineEditing);
const tagKey = (value: unknown) => String(value ?? '').trim().normalize('NFKC').toLocaleLowerCase('es');

export function InlineNewsEditor({ news, onChange, children, categories = [] }: {
  news: NewsDocument; onChange: (news: NewsDocument) => void; children: ReactNode; categories?: { id: string; name: string }[];
}) {
  return <InlineEditing.Provider value={{ news, categories, change: (path, value) => {
    if (path[0] === 'metadatos' && path[1] === 'etiquetas') {
      if (Array.isArray(value) && value.length > 3) return;
      if (!Array.isArray(value)) {
        if (!tagKey(value)) return;
        value = String(value).trim();
      }
    }
    const next = structuredClone(news);
    let parent = next;
    for (const [index, key] of path.slice(0, -1).entries()) {
      if (!Object.hasOwn(parent, key) || !parent[key] || typeof parent[key] !== 'object') {
        Object.defineProperty(parent, key, { value: /^\d+$/.test(path[index + 1]) ? [] : {}, writable: true, enumerable: true, configurable: true });
      }
      parent = parent[key] as NewsDocument;
    }
    Object.defineProperty(parent, path.at(-1)!, { value, enumerable: true, writable: true, configurable: true });
    onChange(next);
  } }}>{children}</InlineEditing.Provider>;
}

export function newsTextLimit(path: Path, news: NewsDocument) {
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

export function InlineNewsCategory({ value }: { value: unknown }) {
  const editing = useInlineNewsEditing();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  if (!editing) return <>{String(value ?? '')}</>;
  const current = String(value ?? '').toLocaleUpperCase('es');
  return <span ref={root} className="news-category-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); }
      else if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const options = [...root.current?.querySelectorAll<HTMLButtonElement>('[role=option]') ?? []];
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
        options[next]?.focus();
      }
    }}>
    <button ref={trigger} type="button" className="inline-news-category" aria-label="Categoría de la noticia" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span>{editing.categories.some(category => category.name.toLocaleUpperCase('es') === current) ? current : 'Selecciona una categoría'}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <span id={id} className="news-category-options" role="listbox" aria-label="Categorías disponibles">
      {!editing.categories.length && <span>No hay categorías disponibles</span>}
      {editing.categories.map(category => <button type="button" role="option" aria-selected={category.name.toLocaleUpperCase('es') === current} key={category.id} onClick={() => { editing.change(['metadatos', 'seccion'], category.name.toLocaleUpperCase('es')); setOpen(false); trigger.current?.focus(); }}>{category.name.toLocaleUpperCase('es')}<span aria-hidden="true">{category.name.toLocaleUpperCase('es') === current ? '✓' : ''}</span></button>)}
    </span>}
  </span>;
}

export function InlineNewsList({ ordered, items, path, children }: {
  ordered: boolean; items: NewsDocument[]; path: Path; children: ReactNode;
}) {
  const editing = useInlineNewsEditing();
  const root = useRef<HTMLOListElement & HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const item = root.current?.children[pendingFocus.current];
    (item?.querySelector('[contenteditable]') as HTMLElement | null)?.focus();
    pendingFocus.current = null;
  }, [items]);
  const List = ordered ? 'ol' : 'ul';
  return <List ref={root} onKeyDownCapture={event => {
    if (!editing || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const li = target.closest('li');
    if (!li || !root.current || !target.isContentEditable) return;
    event.preventDefault(); event.stopPropagation();
    const index = Array.from(root.current.children).indexOf(li);
    const current = items[index];
    const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0).cloneRange() : null;
    let offset = li.innerText.length;
    if (range && li.contains(range.startContainer)) {
      range.selectNodeContents(li); range.setEnd(window.getSelection()!.getRangeAt(0).startContainer, window.getSelection()!.getRangeAt(0).startOffset);
      offset = range.toString().length;
    }
    const value = li.innerText;
    const rich = li.querySelector<HTMLElement>('.inline-rich-text');
    const spans = rich ? inlineSpansFromDOM(rich) : Array.isArray(current.spans) ? current.spans as NewsDocument[] : null;
    const before: NewsDocument[] = [], after: NewsDocument[] = [];
    if (spans) {
      const live = li.querySelectorAll<HTMLElement>('[contenteditable]');
      let position = 0;
      spans.forEach((span, i) => {
        const text = rich ? String(span.texto ?? '') : live[i]?.innerText ?? String(span.texto ?? '');
        const split = Math.max(0, Math.min(text.length, offset - position));
        if (split) before.push({ ...span, texto: text.slice(0, split) });
        if (split < text.length) after.push({ ...span, texto: text.slice(split) });
        position += text.length;
      });
    }
    // Read the live text before committing so an unblurred edit is included.
    target.blur();
    const next = [...items];
    next.splice(index, 1,
      spans && before.length ? { ...current, spans: before } : { ...current, spans: undefined, texto: value.slice(0, offset) },
      spans && after.length ? { spans: after } : { texto: value.slice(offset) });
    pendingFocus.current = index + 1;
    editing.change(path, next);
  }}>{children}</List>;
}

export function InlineNewsText({ path, value, label, placeholder, multiline = false }: {
  path: Path; value: unknown; label: string; placeholder?: string; multiline?: boolean;
}) {
  const editing = useInlineNewsEditing();
  const element = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);
  const [limited, setLimited] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  useEffect(() => {
    if (element.current && !focused.current) element.current.textContent = text;
  }, [text]);
  if (!editing) return <>{text}</>;
  const limit = newsTextLimit(path, editing.news);
  return <span ref={element} className="inline-news-text" contentEditable="plaintext-only" suppressContentEditableWarning
    role="textbox" aria-label={label} aria-multiline={multiline} tabIndex={0}
    aria-invalid={duplicate || undefined}
    title={`${label}: máximo ${limit} caracteres${limited ? ' · Límite alcanzado' : ''}`}
    onInput={event => {
      const node = event.currentTarget;
      const content = multiline ? node.innerText : node.innerText.replace(/[\r\n]+/g, ' ');
      if (path.includes('etiquetas')) {
        const tags = (editing.news.metadatos as NewsDocument)?.etiquetas as unknown[] ?? [];
        setDuplicate(tags.some((tag, index) => index < Number(path.at(-1)) && tagKey(tag) === tagKey(content)));
      }
      if (!multiline && content !== node.innerText) node.textContent = content;
      if (Array.from(content).length > limit) {
        node.textContent = Array.from(content).slice(0, limit).join('');
        const range = document.createRange();
        range.selectNodeContents(node); range.collapse(false);
        window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range);
        setLimited(true);
      } else setLimited(false);
    }}
    data-placeholder={placeholder ?? `Escribir ${label.toLowerCase()}`}
    onFocus={() => { focused.current = true; }}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.currentTarget.textContent = text;
        event.currentTarget.blur();
      }
      if (!multiline && event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      }
    }}
    onBlur={event => {
      focused.current = false;
      setDuplicate(false);
      const next = Array.from(event.currentTarget.innerText.replace(/\r\n/g, '\n')).slice(0, limit).join('');
      if (path.includes('etiquetas')) {
        if (!tagKey(next)) {
          event.currentTarget.textContent = text;
          return;
        }
      }
      if (!next.trim() && (path[0] === 'titular' || path[0] === 'autores')) {
        event.currentTarget.textContent = text;
        return;
      }
      if (typeof value === 'number') {
        if (!next.trim() || !Number.isFinite(Number(next))) {
          event.currentTarget.textContent = text;
          return;
        }
        if (Number(next) !== value) editing.change(path, Number(next));
      } else if (next !== text) editing.change(path, next);
    }}>{text}</span>;
}

export function InlineNewsDate({ path, value, prefix = '' }: { path: Path; value: string; prefix?: string }) {
  const editing = useInlineNewsEditing();
  const [active, setActive] = useState(false);
  if (!editing) return <time dateTime={value}>{prefix}{dateLabel(value)}</time>;
  if (active) return <input autoComplete="off" className="inline-news-date" type="date" aria-label="Fecha de la noticia" autoFocus
    defaultValue={value.slice(0, 10)} onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') { event.currentTarget.value = value.slice(0, 10); event.currentTarget.blur(); }
    }}
    onBlur={event => {
      const next = event.currentTarget.value;
      if (next && next !== value.slice(0, 10)) editing.change(path, next + value.slice(10));
      setActive(false);
    }} />;
  return <button type="button" className="inline-news-date-label" onClick={() => setActive(true)}>{prefix}{dateLabel(value)}</button>;
}

export function InlineNewsTags({ tags }: { tags: unknown[] }) {
  const editing = useInlineNewsEditing();
  return <ul className="tags">
    {tags.map((tag, i) => {
      const duplicate = tags.findIndex(other => tagKey(other) === tagKey(tag)) < i;
      return <li key={i} data-duplicate={duplicate} title={duplicate ? 'Esta etiqueta ya existe. Cambia su nombre.' : undefined}>
        <InlineNewsText path={['metadatos', 'etiquetas', String(i)]} value={tag} label={`Etiqueta ${i + 1}`} />
        {editing && <button type="button" className="tag-remove" aria-label={`Eliminar etiqueta ${String(tag)}`} onClick={() => editing.change(['metadatos', 'etiquetas'], tags.filter((_, index) => index !== i))}>×</button>}
        {duplicate && <span className="sr-only">Etiqueta duplicada. Cambia su nombre.</span>}
      </li>;
    })}
    {editing && <li><button type="button" className="inline-add-tag" disabled={tags.length >= 3} title={tags.length >= 3 ? 'Máximo 3 etiquetas por noticia.' : undefined} onClick={() => {
      if (tags.length >= 3) return;
      let name = 'Nueva etiqueta', suffix = 2;
      while (tags.some(tag => tagKey(tag) === tagKey(name))) name = `Nueva etiqueta ${suffix++}`;
      editing.change(['metadatos', 'etiquetas'], [...tags, name]);
    }}>＋ Etiqueta</button></li>}
  </ul>;
}
