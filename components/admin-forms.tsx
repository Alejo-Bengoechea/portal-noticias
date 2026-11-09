'use client';

import { useActionState } from 'react';
import { deleteArticle, login, manageTerm } from '@/app/mesa-editorial-7k4n/actions';
import type { Term } from '@/lib/articles';

export function LoginForm() {
  const [message, action, pending] = useActionState(login, '');
  return <form autoComplete="off" action={action} className="stack login-form" aria-busy={pending}>
    <label>Correo electrónico<input type="email" name="email" autoComplete="off" placeholder="tu@correo.com" spellCheck={false} required /></label>
    <label>Contraseña<input type="password" name="password" autoComplete="off" placeholder="Introduce tu contraseña" required /></label>
    <button disabled={pending}>{pending ? 'Accediendo…' : 'Acceder a la mesa editorial'}<span aria-hidden="true">{pending ? '…' : '↗'}</span></button><p className="login-feedback" role="status">{message}</p>
  </form>;
}

export function DeleteForm({ id }: { id: string }) {
  const [message, action, pending] = useActionState(deleteArticle, '');
  return <form autoComplete="off" action={action} onSubmit={event => { if (!window.confirm('¿Eliminar esta publicación definitivamente?')) event.preventDefault(); }}>
    <input autoComplete="off" type="hidden" name="id" value={id} />
    <button className="danger" disabled={pending}>Eliminar publicación</button>
    <p role="status">{message}</p>
  </form>;
}

export function TermForm({ table, term }: { table: 'categories' | 'tags'; term?: Term }) {
  const [message, action, pending] = useActionState(manageTerm, '');
  return <form autoComplete="off" action={action} className="term-form" onSubmit={event => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === 'delete' && !window.confirm('¿Eliminar este término de las publicaciones?')) event.preventDefault();
  }}>
    <input autoComplete="off" type="hidden" name="table" value={table} />
    <input autoComplete="off" type="hidden" name="id" value={term?.id ?? ''} />
    <label>{term ? 'Editar nombre' : 'Nombre nuevo'}<input autoComplete="off" key={term?.name} name="name" defaultValue={table === 'categories' ? term?.name.toLocaleUpperCase('es') : term?.name} maxLength={60} required onInput={event => {
      if (table !== 'categories') return;
      const input = event.currentTarget;
      const start = input.selectionStart;
      input.value = input.value.toLocaleUpperCase('es');
      if (start !== null) input.setSelectionRange(start, start);
    }} /></label>
    <button disabled={pending}>{term ? 'Guardar' : 'Añadir'}</button>
    {term && <button className="danger" name="intent" value="delete" formNoValidate disabled={pending}>Eliminar</button>}
    {message && !(table === 'categories' && message === 'Cambio guardado.') && <p role="status">{message}</p>}
  </form>;
}
