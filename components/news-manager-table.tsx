'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { demoNewsDownload, type ManagedNews } from '@/lib/news-manager-demo';
import { NewsRowActions } from './news-row-actions';
import { useRouter } from 'next/navigation';
import { bulkNewsAction } from '@/app/mesa-editorial-7k4n/bulk-news-actions';

type SortHeader = { href: string; direction?: 'ascending' | 'descending' };
const statuses: Record<string, string> = { publicado: 'Publicado', despublicado: 'Despublicado', borrador: 'Borrador' };
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid',
}).format(new Date(value)) : 'Sin registro';

export function NewsManagerTable({ articles, categories, demo, sortHeaders, drafts = false }: {
  articles: ManagedNews[]; categories: { id: string; name: string }[]; demo: boolean; drafts?: boolean;
  sortHeaders: Record<'category' | 'created' | 'updated', SortHeader>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const visible = articles.filter(article => !removed.has(article.id));
  const selection = visible.filter(article => selected.has(article.id));
  useEffect(() => {
    if (confirmDelete && !deleteDialog.current?.open) deleteDialog.current?.showModal();
    if (!confirmDelete && deleteDialog.current?.open) deleteDialog.current.close();
  }, [confirmDelete]);
  async function apply(intent: 'delete' | 'publish' | 'unpublish') {
    if (busy || !selection.length) return;
    setBusy(true); setMessage('');
    try {
      const ids = selection.map(article => article.id);
      if (!demo) {
        const result = await bulkNewsAction(ids, intent);
        if (result.error) { setMessage(result.error); router.refresh(); return; }
      }
      if (intent === 'delete') setRemoved(previous => new Set([...previous, ...ids]));
      else setStatusOverrides(previous => ({ ...previous, ...Object.fromEntries(ids.map(id => [id, intent === 'publish'])) }));
      setSelected(new Set()); setConfirmDelete(false);
      setMessage(demo ? 'Cambio simulado en las noticias de muestra.' : 'Operación completada.');
      if (!demo) router.refresh();
    } catch { setMessage('No se pudo completar la operación. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string | null>>({});
  const all = visible.length > 0 && visible.every(article => selected.has(article.id));
  const some = visible.some(article => selected.has(article.id));
  const selectAll = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = some && !all;
  }, [some, all]);
  const headers = [
    { label: 'ID' }, { label: 'Nombre' }, { label: 'Categoría', sort: sortHeaders.category },
    ...(!drafts ? [{ label: 'Estado' }, { label: 'Creación', sort: sortHeaders.created }] : []),
    { label: 'Última modificación', sort: sortHeaders.updated }, { label: 'Opciones' },
  ];
  return <>
    {selection.length > 0 && <div className="manager-bulk-toolbar" role="group" aria-label="Acciones de noticias seleccionadas">
      <span>{selection.length} {selection.length === 1 ? 'seleccionada' : 'seleccionadas'}</span>
      {!drafts && <><button type="button" disabled={busy} onClick={() => apply('publish')}>Publicar</button><button type="button" disabled={busy} onClick={() => apply('unpublish')}>Despublicar</button></>}
      <button type="button" className="bulk-delete" disabled={busy} onClick={() => { setMessage(''); setConfirmDelete(true); }}>Eliminar</button>
      <button type="button" disabled={busy} onClick={() => setSelected(new Set())}>Cancelar selección</button>
    </div>}
    <p className="manager-bulk-message" role="status">{message}</p>
    <p className="manager-mobile-hint">Desliza la tabla hacia los lados para ver todas las columnas.</p>
    <div className="manager-table-scroll" role="region" aria-label="Tabla de noticias" tabIndex={0}>
    <table className="manager-table" data-drafts={drafts}>
      <caption className="sr-only">{demo ? 'Noticias ficticias de muestra' : 'Noticias guardadas'}</caption>
      <colgroup>{['check', 'id', 'name', 'category', ...(!drafts ? ['status', 'date'] : []), 'date', 'actions'].map((kind, i) => <col key={i} className={`manager-col-${kind}`} />)}</colgroup>
      <thead><tr>
        <th scope="col"><label className="manager-checkbox-control"><input autoComplete="off" ref={selectAll} type="checkbox" aria-label="Seleccionar todas las noticias de esta página"
          checked={all} disabled={busy || !visible.length} onChange={() => setSelected(all ? new Set() : new Set(visible.map(article => article.id)))} /></label></th>
        {headers.map(header => <th scope="col" key={header.label} aria-sort={header.sort?.direction}>
          {header.sort ? <Link href={header.sort.href}>{header.label} <span aria-hidden="true">{header.sort.direction === 'ascending' ? '↑' : header.sort.direction === 'descending' ? '↓' : '↕'}</span></Link> : header.label === 'Opciones' ? <span className="sr-only">Opciones</span> : header.label}
        </th>)}
      </tr></thead>
      <tbody>{visible.map(article => {
        const published = Object.hasOwn(statusOverrides, article.id) ? statusOverrides[article.id] : Boolean(article.published_at);
        const state = published ? 'publicado' : article.ever_published || Object.hasOwn(statusOverrides, article.id) ? 'despublicado' : 'borrador';
        const categoryId = Object.hasOwn(categoryOverrides, article.id) ? categoryOverrides[article.id] : article.category_id;
        return <tr key={article.id} data-selected={selected.has(article.id)}>
          <td className="manager-center"><label className="manager-checkbox-control"><input autoComplete="off" type="checkbox" aria-label={`Seleccionar ${article.title}`}
            checked={selected.has(article.id)} disabled={busy} onChange={() => setSelected(previous => {
              const next = new Set(previous);
              if (next.has(article.id)) next.delete(article.id); else next.add(article.id);
              return next;
            })} /></label></td>
          <td className="manager-id">{article.id}</td>
          <td>{demo ? article.title : <Link href={`/mesa-editorial-7k4n/articulos/${article.id}`}>{article.title}</Link>}</td>
          <td>{(categories.find(category => category.id === categoryId)?.name ?? 'Sin categoría').toLocaleUpperCase('es')}</td>
          {!drafts && <td className="manager-state-cell"><span className="manager-status" data-status={state}>{statuses[state]}</span></td>}
          {!drafts && <td className="manager-center">{date(article.created_at)}</td>}
          <td className="manager-center">{date(article.updated_at)}</td>
          <td className="manager-center"><NewsRowActions id={article.id} title={article.title} published={published} draft={state === 'borrador'} demo={demo}
            categoryId={categoryId} categories={categories} onCategoryChange={value => setCategoryOverrides(previous => ({ ...previous, [article.id]: value }))}
            download={demo ? demoNewsDownload({ ...article, category_id: categoryId, published_at: published ? article.published_at ?? new Date().toISOString() : null }, categories) : `/mesa-editorial-7k4n/publicaciones/${article.id}/json`}
            onStatusChange={value => setStatusOverrides(previous => ({ ...previous, [article.id]: value }))} /></td>
        </tr>;
      })}</tbody>
    </table>
    </div>
    <dialog ref={deleteDialog} className="category-confirm-dialog" aria-labelledby="bulk-delete-title" onCancel={event => { if (busy) event.preventDefault(); else setConfirmDelete(false); }}>
      <h2 id="bulk-delete-title">¿Eliminar {selection.length} {drafts ? 'borradores' : 'noticias'}?</h2>
      <p>{demo ? 'Esta operación se simulará con los datos de muestra.' : 'Se eliminarán definitivamente las noticias seleccionadas. Los archivos multimedia se conservarán en Supabase.'}</p>
      <p role="alert">{message}</p><div className="json-replace-actions"><button type="button" className="json-replace-cancel" autoFocus disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="json-replace-discard" disabled={busy} onClick={() => apply('delete')}>{busy ? 'Eliminando…' : 'Eliminar selección'}</button></div>
    </dialog>
  </>;
}

