import type { SupabaseClient } from '@supabase/supabase-js';
import { workspaceTables, type WorkspaceKind, type WorkspaceRow } from './editorial-workspace';

export async function loadWorkspace(client: SupabaseClient, kind: WorkspaceKind): Promise<{ rows: WorkspaceRow[]; mode: 'cloud' | 'local'; error: string }> {
  const rows: WorkspaceRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client.from(workspaceTables[kind]).select('*').order('updated_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (result.error) {
      if (['42P01', 'PGRST205'].includes(result.error.code)) return { rows: [], mode: 'local', error: '' };
      // A transient/permission error must never silently switch cloud data to local.
      return { rows: [], mode: 'cloud', error: 'No se pudieron cargar los datos de Supabase. Recarga la página para volver a intentarlo.' };
    }
    rows.push(...(result.data ?? []) as WorkspaceRow[]);
    if (!result.data || result.data.length < 500) break;
  }
  return { rows, mode: 'cloud', error: '' };
}
