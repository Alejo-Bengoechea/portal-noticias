'use server';

import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase';
import { mediaLibrary } from '@/lib/media-library';

export async function deleteMedia(path: string, acknowledgeLinks: boolean) {
  const client = await adminClient();
  if (!client) return { error: 'Acceso no autorizado.' };
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) return { error: 'Archivo no válido.' };
  try {
    const asset = (await mediaLibrary(client)).find(item => item.path === path);
    if (!asset) return { error: 'El archivo ya no existe.' };
    if (asset.links.length && !acknowledgeLinks) return { error: 'El archivo está vinculado a noticias. Confirma que aceptas romper esos enlaces.' };
    const { error } = await client.storage.from('editorial').remove([path]);
    if (error) return { error: 'No se pudo eliminar. Comprueba los permisos de Storage.' };
    revalidatePath('/mesa-editorial-7k4n/multimedia');
    return { error: '' };
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo comprobar el archivo.' }; }
}
