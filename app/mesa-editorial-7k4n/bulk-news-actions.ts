'use server';

import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase';

export async function bulkNewsAction(ids: string[], intent: 'delete' | 'publish' | 'unpublish') {
  const client = await adminClient();
  if (!client) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' };
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(ids).size !== ids.length || !['delete', 'publish', 'unpublish'].includes(intent)) return { error: 'La selección no es válida (máximo 500 noticias).' };
  const { data, error } = await client.from('articles').select('id,published_at,ever_published,category_id').in('id', ids);
  if (error || data?.length !== ids.length) return { error: 'No se pudieron comprobar todas las noticias seleccionadas. Actualiza la tabla.' };
  if (intent !== 'delete' && data.some(article => !article.published_at && !article.ever_published)) return { error: 'Los borradores deben abrirse en el editor antes de publicarlos.' };
  if (intent === 'publish' && data.some(article => !article.category_id)) return { error: 'Todas las noticias deben tener una categoría antes de publicar.' };
  let request;
  if (intent === 'delete') request = client.from('articles').delete().in('id', ids);
  else {
    request = client.from('articles').update(intent === 'publish' ? { published_at: new Date().toISOString(), ever_published: true } : { published_at: null }).in('id', ids).or('published_at.not.is.null,ever_published.eq.true');
    if (intent === 'publish') request = request.not('category_id', 'is', null);
  }
  const result = await request.select('id');
  if (result.error) return { error: 'No se pudo completar la operación. Actualiza la tabla e inténtalo de nuevo.' };
  revalidatePath('/', 'layout');
  return { error: result.data?.length === ids.length ? '' : 'Algunas noticias cambiaron durante la operación. Actualiza la tabla para comprobar el resultado.' };
}
