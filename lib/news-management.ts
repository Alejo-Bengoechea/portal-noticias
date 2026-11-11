import { getTerms } from './articles';
import { adminClient } from './supabase';
import type { ManagedNews } from './managed-news';

export type NewsQuery = { q?: string; estado?: string; orden?: string; datos?: string; vista?: string };
const sorts: Record<string, { label: string; column: string; ascending: boolean }> = {
  recientes: { label: 'Creación más reciente', column: 'created_at', ascending: false },
  antiguas: { label: 'Creación más antigua', column: 'created_at', ascending: true },
  actualizadas: { label: 'Última actualización', column: 'updated_at', ascending: false },
  actualizadas_asc: { label: 'Última actualización ascendente', column: 'updated_at', ascending: true },
  categoria: { label: 'Categoría A–Z', column: 'category(name)', ascending: true },
  categoria_desc: { label: 'Categoría Z–A', column: 'category(name)', ascending: false },
};

export async function managedNewsBatch(params: NewsQuery, offset: number, client: NonNullable<Awaited<ReturnType<typeof adminClient>>>) {
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 160) : '';
  const drafts = params.vista === 'borradores';
  const view = drafts ? 'borradores' : 'creadas';
  const state = drafts ? 'borrador' : ['publicado', 'despublicado'].includes(params.estado ?? '') ? params.estado! : '';
  const requestedSort = Object.hasOwn(sorts, params.orden ?? '') ? params.orden! : drafts ? 'actualizadas' : 'recientes';
  const sort = drafts && ['recientes', 'antiguas'].includes(requestedSort) ? 'actualizadas' : requestedSort;
  const sorting = sorts[sort];
  const start = offset;
  let data: ManagedNews[] = [];
  let count = 0;
  let error: { code: string } | null = null;
  let categories: { id: string; name: string }[] = [];
  let request = client.from('articles').select('id,title,slug,published_at,featured,category_id,created_at,updated_at,ever_published,editorial_state:body->metadatos->>estado,category:categories(name)', { count: 'exact' });
  if (q) {
    const term = q.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
    if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(q)) request = request.or(`id.eq.${q},title.ilike.%${q}%`);
    else if (term) request = request.ilike('title', `%${term}%`);
    else request = request.eq('id', '00000000-0000-0000-0000-000000000000');
  }
  if (!drafts && !state) request = request.or('published_at.not.is.null,ever_published.eq.true,body->metadatos->>estado.eq.despublicado');
  if (state === 'publicado') request = request.not('published_at', 'is', null);
  if (state === 'despublicado') request = request.is('published_at', null).or('ever_published.eq.true,body->metadatos->>estado.eq.despublicado');
  if (state === 'borrador') request = request.is('published_at', null).eq('ever_published', false).or('body->metadatos->>estado.is.null,body->metadatos->>estado.neq.despublicado');
  const [result, terms] = await Promise.all([
    request.order(sorting.column, { ascending: sorting.ascending, nullsFirst: false }).order('id').range(start, start + 14),
    getTerms('categories'),
  ]);
    if (result.error && !['42703', 'PGRST204'].includes(result.error.code)) throw result.error;
    data = result.data ?? [];
    count = result.count ?? 0;
    error = result.error;
    categories = terms;
  return { data, count, categories, error, q, state, sort, sorting, drafts, view };
}
