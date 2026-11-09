'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { manageTerm } from '@/app/mesa-editorial-7k4n/actions';
import type { Term } from '@/lib/articles';

export function CategoryCard({ category }: { category: Term & { articleCount: number; demoArticleCount?: number } }) {
  const original = category.name.toLocaleUpperCase('es');
  const [name, setName] = useState(original);
  const [saved, setSaved] = useState(original);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [intent, setIntent] = useState<'save' | 'delete' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (intent && !dialog.current?.open) dialog.current?.showModal();
    if (!intent && dialog.current?.open) dialog.current.close();
  }, [intent]);
  useEffect(() => { setName(original); setSaved(original); }, [original]);
  const [message, action, pending] = useActionState(async (previous: string, form: FormData) => {
    try {
      const result = await manageTerm(previous, form);
      if (result === 'Cambio guardado.' && form.get('intent') !== 'delete') setSaved(String(form.get('name')).trim());
      return result;
    } finally { setSubmittedName(null); }
  }, '');
  const dirty = name.trim() !== saved;
  const blocked = category.articleCount > 0;
  const reason = 'No se puede eliminar: esta categoría tiene noticias asociadas.';
  function cancel() { setName(saved); setIntent(null); }
  return <section className="category-card" aria-label={`Categoría ${original}`}>
    <div className="category-card-heading"><span aria-hidden="true">◇</span><span>{category.articleCount} {category.articleCount === 1 ? 'noticia' : 'noticias'}</span></div>
    {!!category.demoArticleCount && <small className="category-demo-count">{category.demoArticleCount} de muestra · {category.articleCount - category.demoArticleCount} guardadas</small>}
    <form autoComplete="off" ref={formRef} className="category-inline-form" onSubmit={event => {
      event.preventDefault();
      const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
      if (intent === 'delete' && blocked) return;
      setIntent(intent === 'delete' ? 'delete' : 'save');
    }}>
      <input autoComplete="off" type="hidden" name="id" value={category.id} /><input autoComplete="off" type="hidden" name="table" value="categories" />
      <h3><input autoComplete="off" className="category-inline-name" aria-label={`Nombre de la categoría ${original}`} title="Haz clic para editar el nombre"
        name="name" value={name} maxLength={60} required disabled={pending} onChange={event => setName(event.target.value.toLocaleUpperCase('es'))}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); if (dirty && name.trim()) setIntent('save'); }
          if (event.key === 'Escape') { setName(saved); event.currentTarget.blur(); }
        }} /></h3>
      <div className="category-card-actions">
        <span className="category-delete-control" title={blocked ? reason : undefined}>
          <button type="submit" className="danger" name="intent" value="delete" formNoValidate disabled={pending || blocked}>Eliminar</button>
          {blocked && <span role="tooltip" className="category-delete-tooltip">{reason}</span>}
        </span>
        {dirty && !submittedName && name.trim() && <button type="submit" name="intent" value="save">Guardar</button>}
      </div>
      {message && message !== 'Cambio guardado.' && <p role="status">{message}</p>}
    </form>
    <dialog className="category-confirm-dialog" ref={dialog} aria-label="Confirmar cambio de categoría"
      onCancel={cancel} onClose={() => { if (!dialog.current?.open) setIntent(null); }}>
      <h2>{intent === 'delete' ? 'Eliminar categoría' : 'Guardar categoría'}</h2>
      <p>{intent === 'delete' ? `¿Seguro que quieres eliminar «${saved}»?` : `¿Seguro que quieres guardar el nombre «${name.trim()}»?`}</p>
      <div className="category-card-actions">
        <button type="button" onClick={cancel}>Cancelar</button>
        <button type="button" onClick={() => {
          if (!formRef.current || !intent || intent === 'delete' && blocked) return;
          const form = new FormData(formRef.current);
          form.set('intent', intent);
          if (intent === 'save') setSubmittedName(name.trim());
          setIntent(null);
          startTransition(() => action(form));
        }}>Confirmar</button>
      </div>
    </dialog>
  </section>;
}
