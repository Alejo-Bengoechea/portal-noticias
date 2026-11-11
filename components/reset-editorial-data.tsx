'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetEditorialData } from '@/app/mesa-editorial-7k4n/reset-actions';

export function ResetEditorialData() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [message, action, pending] = useActionState(resetEditorialData, '');
  useEffect(() => {
    if (!pending && message === 'Contenido editorial eliminado.') {
      dialog.current?.close();
      router.replace('/mesa-editorial-7k4n'); router.refresh();
    }
  }, [message, pending, router]);
  return <>
    <button type="button" className="console-footer-action console-reset" onClick={() => { setConfirmation(''); dialog.current?.showModal(); }}><span aria-hidden="true">↺</span>Limpiar base de datos</button>
    <dialog ref={dialog} className="category-confirm-dialog" aria-labelledby="reset-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="reset-title">¿Vaciar el contenido editorial?</h2>
      <p>Eliminará noticias, borradores, categorías, etiquetas, agenda, ideas, fuentes, tráfico y todos los archivos del bucket editorial. No se puede deshacer.</p>
      <form autoComplete="off" action={action} className="stack">
        <label>Escribe LIMPIAR<input autoComplete="off" name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending} /></label>
        {message && message !== 'Contenido editorial eliminado.' && <p role="alert">{message}</p>}
        <div className="json-replace-actions"><button type="button" className="json-replace-cancel" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><button className="json-replace-discard" disabled={pending || confirmation !== 'LIMPIAR'}>{pending ? 'Limpiando…' : 'Eliminar contenido'}</button></div>
      </form>
    </dialog>
  </>;
}
