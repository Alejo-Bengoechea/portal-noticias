'use client';

import { useEffect, useState } from 'react';
import { createNewsBlock, type NewsDocument } from '@/lib/news-components';
import { webUrl } from '@/lib/format';
import { useInlineNewsEditing } from './inline-news-editor';

function SourceRow({ source, index, path, onRemove, initiallyOpen = false }: { source: NewsDocument; index: number; path: string[]; onRemove: () => void; initiallyOpen?: boolean }) {
  const editing = useInlineNewsEditing();
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState(String(source.titulo ?? ''));
  const [url, setUrl] = useState(String(source.url ?? ''));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) { setTitle(String(source.titulo ?? '')); setUrl(String(source.url ?? '')); setError(''); }
  }, [source.titulo, source.url, open]);
  const href = webUrl(source.url);
  return <li className="source-preview-item" id={editing ? `news-field-${path.join('-')}-titulo` : undefined}>
    {href ? <a href={href} rel="noreferrer" target={editing ? '_blank' : undefined}>{String(source.titulo ?? '') || href}</a> : String(source.titulo ?? '')}
    {editing && <div className="source-preview-controls">
      <button type="button" aria-label={`Editar fuente ${index + 1}`} onClick={() => setOpen(!open)}>Editar</button>
      <button type="button" aria-label={`Quitar fuente ${index + 1}`} onClick={onRemove}>Quitar</button>
    </div>}
    {editing && open && <form autoComplete="off" className="source-edit-form" onSubmit={event => {
      event.preventDefault();
      const safe = url.trim() ? webUrl(url.trim()) : '';
      if (url.trim() && !safe) { setError('Introduce una URL HTTP o HTTPS válida.'); return; }
      if (!title.trim()) { setError('Escribe el nombre de la fuente.'); return; }
      editing.change(path, { ...source, titulo: title.trim(), url: safe });
      setOpen(false);
    }}>
      <label>Nombre de la fuente<input autoComplete="off" aria-label="Nombre de la fuente" autoFocus maxLength={120} required value={title} onFocus={event => { if (initiallyOpen) event.currentTarget.select(); }} onChange={event => setTitle(event.target.value)} /></label>
      <label>URL de la fuente<input autoComplete="off" aria-label="URL de la fuente" type="url" maxLength={2048} placeholder="https://…" value={url} onChange={event => { setUrl(event.target.value); setError(''); }} /></label>
      <div className="toolbar"><button type="submit">Guardar fuente</button><button type="button" onClick={() => setOpen(false)}>Cancelar</button></div>
      {error && <span role="alert">{error}</span>}
    </form>}
  </li>;
}

export function NewsSources({ body }: { body: NewsDocument[] }) {
  const editing = useInlineNewsEditing();
  const [newSourceId, setNewSourceId] = useState<string | null>(null);
  const groups = body.map((block, index) => ({ block, index })).filter(item => item.block.tipo === 'fuentes');
  if (!groups.length && !editing) return null;
  function addSource() {
    if (!editing) return;
    const created = createNewsBlock('fuentes');
    setNewSourceId(String((created.block.elementos as NewsDocument[])[0].id));
    editing.change(['cuerpo'], [...body, created.block]);
  }
  return <footer className="preview-sources" aria-label="Fuentes de la noticia">
    <div className="sources-heading"><h2>Fuentes</h2>{editing && <small>Opcional</small>}</div>
    {!groups.length && editing && <p className="sources-empty">Puedes añadir las referencias y enlaces de esta noticia.</p>}
    {groups.map(({ block, index }) => {
      const items = Array.isArray(block.elementos) ? block.elementos.map(item => item && typeof item === 'object' && !Array.isArray(item) ? item as NewsDocument : {}) : [];
      return <div key={String(block.id ?? index)} data-preview-block={index} id={String(block.id ?? '')}>
        <ol>{items.map((source, i) => <SourceRow key={String(source.id ?? i)} source={source} initiallyOpen={Boolean(editing && source.id === newSourceId)} index={i} path={['cuerpo', String(index), 'elementos', String(i)]} onRemove={() => {
          if (!editing) return;
          if (items.length === 1) editing.change(['cuerpo'], body.filter((_, position) => position !== index));
          else editing.change(['cuerpo', String(index), 'elementos'], items.filter((_, position) => position !== i));
        }} />)}</ol>
        {editing && <button type="button" className="source-add" onClick={() => {
          const id = crypto.randomUUID(); setNewSourceId(id);
          editing.change(['cuerpo', String(index), 'elementos'], [...items, { id, titulo: 'Nombre de la fuente', url: '' }]);
        }}>＋ Añadir fuente</button>}
      </div>;
    })}
    {editing && !groups.length && <button type="button" className="source-add" onClick={addSource}>＋ Añadir fuente</button>}
  </footer>;
}
