'use server';

import { adminClient } from '@/lib/supabase';
import { listEditorialAssets } from '@/lib/media-library';
import { revalidatePath } from 'next/cache';

// Temporal para pruebas. Lista cerrada: nunca toca Auth, administrador o esquema.
export async function resetEditorialData(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  if (!client) return 'No se pudo autorizar la limpieza.';
  if (form.get('confirmation') !== 'LIMPIAR') return 'Escribe LIMPIAR para confirmar.';

  const inventory = await client.rpc('editorial_storage_count');
  if (inventory.error?.code === 'PGRST202' || inventory.error?.code === '42883') {
    return 'Ejecuta 202611110001_reset_editorial_storage.sql en SQL Editor para habilitar la limpieza de fotos.';
  }
  if (inventory.error || inventory.data == null) return 'No se pudo comprobar el inventario del bucket editorial.';

  const bucket = client.storage.from('editorial');
  let paths: string[];
  try {
    const assets = await listEditorialAssets(bucket);
    paths = Array.from(new Set(assets.map(asset => asset.path)));
  } catch {
    return 'No se pudo listar el bucket editorial. Comprueba los permisos de Storage.';
  }
  if (paths.length !== Number(inventory.data)) {
    return 'El listado del bucket editorial está incompleto. Comprueba los permisos de Storage o vuelve a intentarlo cuando terminen las subidas.';
  }

  const { error } = await client.rpc('reset_editorial_test_data', { confirmation: 'LIMPIAR' });
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'Falta instalar la limpieza segura. Ejecuta 202611090004_reset_editorial_test_data.sql en SQL Editor de Supabase y vuelve a intentarlo. No se ha borrado ningún dato en este intento.';
  if (error) {
    const cause = String(error.message ?? 'Supabase no devolvió una descripción.').slice(0, 400);
    if (/requires? (a )?where|without (a )?where|safeupdate/i.test(cause)) return 'Supabase bloqueó un borrado sin condición WHERE. Ejecuta 202611090005_reset_safe_delete.sql en SQL Editor y vuelve a intentarlo. La función sigue siendo atómica.';
    return `No se pudo confirmar la limpieza. Código: ${error.code || 'sin código'}. Causa: ${cause}`;
  }
  revalidatePath('/', 'layout');
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error: storageError } = await bucket.remove(paths.slice(offset, offset + 100));
    if (storageError) return 'La base de datos se vació, pero falló el borrado de archivos del bucket editorial. Comprueba los permisos de Storage y vuelve a ejecutar la limpieza.';
  }
  const remaining = await client.rpc('editorial_storage_count');
  if (remaining.error || remaining.data == null || Number(remaining.data) !== 0) {
    return 'La base de datos se vació, pero no se pudo confirmar que el bucket editorial esté vacío. Revisa Storage y vuelve a intentarlo.';
  }
  return 'Contenido editorial eliminado.';
}
