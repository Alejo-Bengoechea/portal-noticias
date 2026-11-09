'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { importWorkspace, removeWorkspace, saveWorkspace } from '@/app/mesa-editorial-7k4n/workspace-actions';
import { readWorkspaceLocal, validateWorkspaceValues, workspaceKey, type WorkspaceKind, type WorkspaceRow } from '@/lib/editorial-workspace';

export type WorkspaceInitial = { rows: WorkspaceRow[]; mode: 'local' | 'cloud'; error: string };
export function useWorkspaceStore<T extends WorkspaceRow>(kind: WorkspaceKind, initial: WorkspaceInitial) {
  const [rows, setRows] = useState<T[]>(initial.rows as T[]);
  const [loading, setLoading] = useState(initial.mode === 'local');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initial.error);
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [available, setAvailable] = useState<WorkspaceRow[]>([]);
  const busy = useRef(false);
  useEffect(() => {
    if (initial.mode === 'cloud') {
      setRows(initial.rows as T[]); setBlocked(Boolean(initial.error)); setError(initial.error);
      try { const ids = new Set(initial.rows.map(row => row.id)); setAvailable(readWorkspaceLocal(kind, localStorage).filter(row => !ids.has(row.id))); }
      catch { setError('La copia local no se pudo leer. Tus datos de Supabase siguen disponibles.'); }
      setLoading(false); return;
    }
    const updateLocal = () => {
      try { setRows(readWorkspaceLocal(kind, localStorage) as T[]); setBlocked(false); }
      catch { setError('No se puede leer el guardado local. No se sobrescribirá: conserva los datos del navegador y revisa su copia.'); setBlocked(true); }
      finally { setLoading(false); }
    };
    updateLocal(); window.addEventListener('storage', updateLocal); window.addEventListener('focus', updateLocal);
    return () => { window.removeEventListener('storage', updateLocal); window.removeEventListener('focus', updateLocal); };
  }, [kind, initial.mode, initial.rows, initial.error]);
  async function save(id: string | null, values: unknown) {
    if (busy.current || blocked || loading) return false;
    busy.current = true; setPending(true); setError('');
    try {
      const valid = validateWorkspaceValues(kind, values);
      let row: WorkspaceRow;
      if (initial.mode === 'cloud') {
        const result = await saveWorkspace(kind, id, valid);
        if (result.error || !result.row) throw new Error(result.error || 'No se pudo guardar.');
        row = result.row;
      } else {
        const stored = readWorkspaceLocal(kind, localStorage);
        const original = id ? stored.find(row => row.id === id) : null;
        if (id && !original) throw new Error('El registro ya no existe. Recarga la página.');
        const now = new Date().toISOString();
        row = { id: id ?? crypto.randomUUID(), created_at: original?.created_at ?? now, updated_at: now, ...valid };
        const next = [row, ...stored.filter(item => item.id !== row.id)];
        localStorage.setItem(workspaceKey(kind), JSON.stringify(next));
        setRows(next as T[]);
      }
      setRows(previous => [row as T, ...previous.filter(item => item.id !== row.id)]);
      return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar. Tu contenido sigue abierto.'); return false; }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(id: string) {
    if (busy.current || blocked || loading) return false;
    busy.current = true; setPending(true); setError('');
    try {
      if (initial.mode === 'cloud') { const result = await removeWorkspace(kind, id); if (result.error) throw new Error(result.error); }
      else {
        const next = readWorkspaceLocal(kind, localStorage).filter(row => row.id !== id);
        localStorage.setItem(workspaceKey(kind), JSON.stringify(next)); setRows(next as T[]);
      }
      if (initial.mode === 'cloud') setRows(previous => previous.filter(row => row.id !== id)); return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo eliminar.'); return false; }
    finally { busy.current = false; setPending(false); }
  }
  async function importLocal() {
    if (busy.current || blocked || !available.length) return;
    busy.current = true; setPending(true); setError('');
    try {
      const batch = available.slice(0, 50);
      const result = await importWorkspace(kind, batch);
      if (result.error) throw new Error(result.error);
      setRows(previous => { const ids = new Set(previous.map(row => row.id)); return [...(result.rows ?? []).filter(row => !ids.has(row.id)) as T[], ...previous]; });
      const processed = new Set(batch.map(row => row.id)); setAvailable(previous => previous.filter(row => !processed.has(row.id)));
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo importar. La copia local se conserva.'); }
    finally { busy.current = false; setPending(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ version: 1, kind, records: rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${kind}-copia.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { rows, save, remove, pending, error, loading, blocked, mode: initial.mode, localCount: available.length, importLocal, download };
}
export function WorkspaceStorage({ stores }: { stores: { label: string; store: Pick<ReturnType<typeof useWorkspaceStore>, 'mode' | 'pending' | 'localCount' | 'importLocal' | 'download' | 'error' | 'loading' | 'blocked'> }[] }) {
  const local = stores.some(({ store }) => store.mode === 'local');
  return <div className="workspace-storage"><div><span className="workspace-storage-dot" data-local={local} /><span>{local ? 'Guardado local · Solo en este navegador' : 'Almacenamiento en Supabase'}</span></div>
    {local && <p>Las tablas de organización aún no están habilitadas en Supabase. Puedes trabajar aquí y guardar una copia; al habilitarlas podrás importar tus registros locales.</p>}
    <div className="workspace-storage-actions">{stores.map(({ label, store }) => <span key={label}>{store.mode === 'local' && <button type="button" disabled={store.loading || store.pending || store.blocked} onClick={store.download}>Copia de {label.toLocaleLowerCase('es')} ↓</button>}{store.mode === 'cloud' && store.localCount > 0 && <button type="button" disabled={store.pending || store.blocked} onClick={store.importLocal}>Importar {Math.min(store.localCount, 50)} {label.toLocaleLowerCase('es')} locales</button>}</span>)}</div>
    {stores.map(({ label, store }) => store.error && <p key={label} role="alert" className="workspace-error">{label}: {store.error}</p>)}
  </div>;
}
export function WorkspaceDialog({ open, title, children, onClose, busy = false }: { open: boolean; title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="workspace-dialog" aria-label={title} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}><header><h2>{title}</h2><button type="button" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}>×</button></header>{children}</dialog>;
}
