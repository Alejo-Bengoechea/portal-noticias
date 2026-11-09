'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { changeNewsCategory, changePublicationStatus } from '@/app/mesa-editorial-7k4n/actions';

export function NewsRowActions({ id, title, published, draft = false, download, demo = false, onStatusChange, categoryId, categories, onCategoryChange }: {
  id: string; title: string; published: boolean; draft?: boolean; download: string; demo?: boolean; onStatusChange?: (published: boolean) => void;
  categoryId: string | null; categories: { id: string; name: string }[]; onCategoryChange: (id: string | null) => void;
}) {
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryDialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(categoryId ?? '');
  useEffect(() => {
    if (categoryOpen && !categoryDialog.current?.open) categoryDialog.current?.showModal();
    if (!categoryOpen && categoryDialog.current?.open) categoryDialog.current.close();
  }, [categoryOpen]);
  const [categoryMessage, categoryAction, changingCategory] = useActionState(async (previous: string, form: FormData) => {
    const next = String(form.get('category') ?? '');
    if (!next && !draft) return 'Selecciona una categoría.';
    if (next && !categories.some(category => category.id === next)) return 'Selecciona una categoría existente.';
    const result = demo ? 'Categoría actualizada.' : await changeNewsCategory(previous, form);
    if (result === 'Categoría actualizada.') { onCategoryChange(next || null); setCategoryOpen(false); }
    return result;
  }, '');
  const [message, action, pending] = useActionState(async (previous: string, form: FormData) => {
    const result = await changePublicationStatus(previous, form);
    if (result === 'Estado actualizado.') { onStatusChange?.(!published); menu.current?.hidePopover(); }
    return result;
  }, '');
  return <>
    <button type="button" className="news-config-button" aria-label={`Opciones de ${title}`} popoverTarget={menuId}
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)),
          top: rect.bottom + 250 < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - 250) });
      }}>
      <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 2-3-2-2 1-3-3-2-1-3H9z" /><circle cx="10" cy="12" r="3" />
      </svg>
    </button>
    <div ref={menu} id={menuId} popover="auto" className="news-row-menu" style={position}>
      <p>Gestionar noticia</p>
      {!draft && (demo ? <div className="news-row-menu-options">
        <button type="button" onClick={() => { onStatusChange?.(!published); menu.current?.hidePopover(); }}>{published ? 'Despublicar' : 'Publicar'}</button>
      </div> : <form autoComplete="off" action={action}>
        <input autoComplete="off" type="hidden" name="id" value={id} />
        <button name="intent" value={published ? 'unpublish' : 'publish'} disabled={pending}>{pending ? 'Actualizando…' : published ? 'Despublicar' : 'Publicar'}</button>
        {message && <span className="news-action-message" role="status">{message}</span>}
      </form>)}
      {demo ? <button type="button" disabled title="Esta noticia es ficticia. Usa las noticias guardadas para editar.">Editar · muestra</button>
        : <Link href={`/mesa-editorial-7k4n/articulos/${id}`}>Editar</Link>}
      <button type="button" onClick={() => { setChoice(categoryId ?? ''); menu.current?.hidePopover(); setCategoryOpen(true); }}>Cambiar categoría</button>
      {!draft && <a href={download} download={demo ? `${id}.json` : true} onClick={() => menu.current?.hidePopover()}>Descargar JSON</a>}
      {demo && <small>Cambios de muestra, sin guardar.</small>}
    </div>
    <dialog ref={categoryDialog} className="category-confirm-dialog" aria-label={`Cambiar categoría de ${title}`} onCancel={() => setCategoryOpen(false)} onClose={() => { if (!categoryDialog.current?.open) setCategoryOpen(false); }}>
      <h2>Cambiar categoría</h2><p>{title}</p>
      <form autoComplete="off" action={categoryAction} className="stack">
        <input autoComplete="off" type="hidden" name="id" value={id} />
        <label>Categoría<select name="category" aria-label="Categoría de la noticia" value={choice} required={!draft} onChange={event => setChoice(event.target.value)}>
          <option value="" disabled={!draft}>{draft ? 'Sin categoría' : 'Selecciona una categoría'}</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name.toLocaleUpperCase('es')}</option>)}
        </select></label>
        {categoryMessage && categoryMessage !== 'Categoría actualizada.' && <p role="alert">{categoryMessage}</p>}
        <div className="category-card-actions"><button type="button" onClick={() => setCategoryOpen(false)}>Cancelar</button><button disabled={changingCategory}>{changingCategory ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
    </dialog>
  </>;
}

