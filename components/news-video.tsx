'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { NewsDocument } from '@/lib/news-components';
import { webUrl, youtubeId } from '@/lib/format';
import { useInlineNewsEditing } from './inline-news-editor';

export function NewsVideo({ block, path, title, embeds }: { block: NewsDocument; path: string[]; title: ReactNode; embeds: boolean }) {
  const editing = useInlineNewsEditing();
  const saved = String(block.url || block.urlEmbed || '');
  const [url, setUrl] = useState(saved);
  const [error, setError] = useState('');
  const [editingUrl, setEditingUrl] = useState(!youtubeId(saved));
  useEffect(() => { setUrl(saved); setError(''); setEditingUrl(!youtubeId(saved)); }, [saved]);
  const video = youtubeId(block.url) || youtubeId(block.urlEmbed);
  return <figure className="preview-note news-video">
    <figcaption>{title}</figcaption>
    {editing && editingUrl && <form autoComplete="off" className="news-video-form" onSubmit={event => {
      event.preventDefault();
      const next = url.trim();
      if (next && !youtubeId(next)) { setError('Introduce un enlace válido de YouTube (youtube.com o youtu.be).'); return; }
      editing.change(path, { ...block, url: next ? webUrl(next) : '', urlEmbed: '' });
      setError('');
      setEditingUrl(!next);
    }}>
      <label>Enlace de YouTube<input autoComplete="off" type="url" maxLength={2048} aria-label="Enlace de YouTube" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={event => { setUrl(event.target.value); setError(''); }} /></label>
      <button type="submit">{video ? 'Aplicar cambios' : 'Insertar vídeo'}</button>
      {video && <button type="button" onClick={() => { setUrl(saved); setEditingUrl(false); }}>Cancelar</button>}
      {error && <span role="alert">{error}</span>}
    </form>}
    <div className="news-video-player">
      {editing && video && !editingUrl && <button type="button" className="video-update-overlay" onClick={() => setEditingUrl(true)}>Actualizar vídeo</button>}
      {embeds && video ? <iframe className="aspect-video w-full" title={String(block.titulo || 'Vídeo de YouTube')} src={`https://www.youtube-nocookie.com/embed/${video}`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <div className="preview-media">{video ? 'Vista de vídeo deshabilitada' : 'Añade un enlace para previsualizar el vídeo.'}</div>}
    </div>
    {webUrl(block.transcripcionUrl) && <a href={webUrl(block.transcripcionUrl)} rel="noreferrer">Transcripción</a>}
  </figure>;
}
