'use server';

import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase';
import { validateWorkspaceValues, validId, workspaceTables, type WorkspaceKind, type WorkspaceRow } from '@/lib/editorial-workspace';

function refresh(kind: WorkspaceKind) { revalidatePath(`/mesa-editorial-7k4n/${kind === 'sources' ? 'fuentes' : 'organizacion'}`); }
export async function saveWorkspace(kind: WorkspaceKind, id: string | null, values: unknown): Promise<{ error: string; row?: WorkspaceRow }> {
  const client = await adminClient();
  if (!client || !Object.hasOwn(workspaceTables, kind) || id !== null && !validId(id)) return { error: 'No se pudo autorizar el guardado.' };
  try {
    const row = validateWorkspaceValues(kind, values);
    const table = client.from(workspaceTables[kind]);
    const result = await (id ? table.update(row).eq('id', id) : table.insert(row)).select('*').single();
    if (result.error) return { error: 'No se pudo guardar en Supabase. Comprueba la conexión y las tablas de organización.' };
    refresh(kind); return { error: '', row: result.data as WorkspaceRow };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Revisa los datos.' }; }
}
export async function removeWorkspace(kind: WorkspaceKind, id: string) {
  const client = await adminClient();
  if (!client || !Object.hasOwn(workspaceTables, kind) || !validId(id)) return { error: 'No se pudo autorizar la eliminación.' };
  const { error } = await client.from(workspaceTables[kind]).delete().eq('id', id).select('id').single();
  if (error) return { error: 'No se pudo eliminar el registro. Recarga la página e inténtalo de nuevo.' };
  refresh(kind); return { error: '' };
}
export async function importWorkspace(kind: WorkspaceKind, rows: WorkspaceRow[]): Promise<{ error: string; rows?: WorkspaceRow[] }> {
  const client = await adminClient();
  if (!client || !Object.hasOwn(workspaceTables, kind) || !Array.isArray(rows) || !rows.length || rows.length > 50) return { error: 'No se pudo autorizar la importación (máximo 50 registros por lote).' };
  try {
    const ids = new Set<string>();
    const values = rows.map(row => {
      if (!row || !validId(row.id) || ids.has(row.id)) throw new Error('Hay identificadores locales no válidos o repetidos.');
      ids.add(row.id);
      return { id: row.id, ...validateWorkspaceValues(kind, row) };
    });
    const result = await client.from(workspaceTables[kind]).upsert(values, { onConflict: 'id', ignoreDuplicates: true }).select('*');
    if (result.error) return { error: 'No se pudieron importar los registros. La copia local se conserva.' };
    refresh(kind); return { error: '', rows: result.data as WorkspaceRow[] };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Importación no válida.' }; }
}
