'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MediaAsset } from '@/lib/media-library';
import { deleteMedia } from '@/app/mesa-editorial-7k4n/multimedia/actions';

function bytes(size: number | null) { return size === null ? 'Peso desconocido' : size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`; }

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(24); const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [acknowledged, setAcknowledged] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const current = assets.filter(asset => !removed.includes(asset.path));
  const visible = current.filter(asset => (filter === 'all' || (filter === 'linked' ? asset.links.length > 0 : !asset.links.length)) && `${asset.path} ${asset.links.map(link => link.title).join(' ')}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  async function remove() {
    if (!selected || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await deleteMedia(selected.path, acknowledged);
      if (result.error) setMessage(result.error);
      else { setRemoved(previous => [...previous, selected.path]); setSelected(null); }
    } catch { setMessage('No se pudo eliminar el archivo. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <section className="media-library">
    <h1>Multimedia</h1>
    <p className="media-library-note">Archivos del almacenamiento editorial de Supabase. Los vídeos de YouTube permanecen en YouTube.</p>
    <div className="media-summary"><span>{current.length} archivos</span><span>{bytes(current.reduce((total, asset) => total + (asset.size ?? 0), 0))} conocidos</span><span>{current.filter(asset => asset.links.length).length} vinculados</span></div>
    <p className="media-library-note">Las asociaciones incluyen noticias guardadas y borradores guardados. No incluyen previsualizaciones sin guardar, JSON locales ni usos fuera de esta web. Un archivo sin vínculos detectados puede seguir utilizándose en ellos. Eliminar un archivo no se puede deshacer.</p>
    <form autoComplete="off" className="media-toolbar" onSubmit={event => event.preventDefault()}>
      <input aria-label="Buscar archivo o noticia" type="search" autoComplete="off" placeholder="Buscar archivo o noticia…" value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} />
      <select aria-label="Filtrar por asociación" value={filter} onChange={event => { setFilter(event.target.value); setLimit(24); }}><option value="all">Todos los archivos</option><option value="linked">Con noticias vinculadas</option><option value="unlinked">Sin vínculos detectados</option></select>
      <span>{visible.length} resultados</span>
    </form>
    <p role="status">{!selected && message}</p>
    <div className="media-grid">{visible.slice(0, limit).map(asset => <article className="media-card" key={asset.path}>
      {asset.mime.startsWith('image/') && <img src={asset.url} alt={asset.path} loading="lazy" />}
      <h2>{asset.path}</h2><p>{bytes(asset.size)} · {asset.mime}<br />Subido: {asset.created ? new Date(asset.created).toLocaleString('es-ES') : 'Sin fecha'}</p>
      <div className="media-card-actions"><a href={asset.url} target="_blank" rel="noreferrer">Ver archivo ↗</a><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(asset.url); setMessage(''); } catch { setMessage('No se pudo copiar la URL. Puedes abrir el archivo y copiar su dirección.'); } }}>Copiar URL</button><button type="button" className="media-delete" onClick={() => { setSelected(asset); setAcknowledged(false); setMessage(''); }}>Eliminar</button></div>
      <details><summary>{asset.links.length ? `${asset.links.length} noticias vinculadas` : 'Sin vínculos detectados'}</summary><ul>{asset.links.map(link => <li key={link.id}><Link href={`/mesa-editorial-7k4n/articulos/${link.id}`}>{link.title}</Link> · {link.cover ? 'Portada' : 'Contenido'}</li>)}</ul></details>
    </article>)}</div>
    {!visible.length && <p>No hay archivos que mostrar.</p>}
    {visible.length > limit && <button type="button" onClick={() => setLimit(value => value + 24)}>Ver más archivos</button>}
    {selected && <div className="media-confirm"><div role="dialog" aria-modal="true" aria-labelledby="media-delete-title"><h2 id="media-delete-title">¿Eliminar este archivo?</h2><p>{selected.path}</p><p>Se borrará de Supabase definitivamente. Sus enlaces dejarán de funcionar.</p>
      {selected.links.length > 0 && <><ul>{selected.links.map(link => <li key={link.id}>{link.title}</li>)}</ul><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />Acepto que la imagen deje de verse en estas noticias.</label></>}
      <p role="alert">{message}</p><div className="media-card-actions"><button type="button" autoFocus disabled={busy} onClick={() => setSelected(null)}>Cancelar</button><button type="button" className="media-delete" disabled={busy || Boolean(selected.links.length && !acknowledged)} onClick={remove}>{busy ? 'Eliminando…' : 'Eliminar definitivamente'}</button></div>
    </div></div>}
  </section>;
}
