'use server';

import { adminClient } from '@/lib/supabase';
import { managedNewsBatch, type NewsQuery } from '@/lib/news-management';

export async function loadMoreNews(query: NewsQuery, offset: number) {
  const client = await adminClient();
  if (!client) return { articles: [], total: 0, error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' };
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) return { articles: [], total: 0, error: 'Solicitud no válida.' };
  try {
    const batch = await managedNewsBatch(query, offset, client);
    if (batch.error) return { articles: [], total: 0, error: 'No se pudieron cargar las noticias.' };
    return { articles: batch.data, total: batch.count, error: '' };
  } catch {
    return { articles: [], total: 0, error: 'No se pudieron cargar las noticias. Inténtalo de nuevo.' };
  }
}
