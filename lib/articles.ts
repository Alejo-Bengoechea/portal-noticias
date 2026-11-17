import type { JSONContent } from '@tiptap/react';
import { cache } from 'react';
import { publicClient } from './supabase';

export type Term = { id: string; name: string; slug: string };
export type Article = {
  id: string; slug: string; title: string; subtitle: string; author: string;
  body: JSONContent; body_format: 'tiptap' | 'editorial'; category_id: string | null; tag_ids: string[]; cover_url: string | null;
  cover_alt: string; featured: boolean; published_at: string | null; ever_published?: boolean;
};
export type ArticleCard = Pick<Article, 'id' | 'slug' | 'title' | 'subtitle' | 'category_id' | 'cover_url' | 'cover_alt' | 'published_at' | 'featured'>;
const cardFields = 'id,slug,title,subtitle,category_id,cover_url,cover_alt,published_at,featured';
export const articlePageSize = 12;
export const getTerms = cache(async (table: 'categories' | 'tags'): Promise<Term[]> => {
  const client = publicClient();
  if (!client) return [];
  const { data, error } = await client.from(table).select('*').order('name');
  if (error) throw error;
  return table === 'categories' ? data.map(term => ({ ...term, name: String(term.name).toLocaleUpperCase('es') })) : data;
});

export const getArticles = cache(async (category?: string, query = '', page = 1, coverId?: string | string[], pageSize = articlePageSize, sort: 'published_at' | 'created_at' = 'published_at'): Promise<ArticleCard[]> => {
  const client = publicClient();
  const start = (page - 1) * pageSize;
  const term = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (query && !term) return [];
  if (!client) return [];
  let request = client.from('articles').select(cardFields).lte('published_at', new Date().toISOString())
    .order(sort, { ascending: false }).order('id').range(start, start + pageSize);
  if (category) request = request.eq('category_id', category);
  for (const id of [coverId ?? []].flat()) request = request.neq('id', id);
  if (term) request = request.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data;
});

export const getHomeArticles = cache(async (coverId?: string | string[]): Promise<ArticleCard[]> => {
  // Por orden de creación: 4 en «Lo más reciente» y hasta 15 en «Últimas noticias», que empieza en la quinta.
  return getArticles(undefined, '', 1, coverId, 19, 'created_at');
});

// «Más populares»: las 3 publicadas con más visitas en los últimos 30 días.
// Excluye las portadas de inicio. Si hay menos de 3 con visitas (o la función de visitas aún no existe), se completa con las más recientes.
export const getPopularArticles = cache(async (excluded: string[] = []): Promise<ArticleCard[]> => {
  const client = publicClient();
  if (!client) return [];
  const now = new Date().toISOString();
  const ranked: string[] = [];
  try {
    const { data } = await client.rpc('popular_articles', { max_items: 3 + excluded.length, days: 30 });
    if (Array.isArray(data)) ranked.push(...data.map((row: { id: string }) => row.id).filter(id => !excluded.includes(id)).slice(0, 3));
  } catch {}
  const popular: ArticleCard[] = [];
  if (ranked.length) {
    const { data, error } = await client.from('articles').select(cardFields).in('id', ranked).lte('published_at', now);
    if (error) throw error;
    popular.push(...ranked.flatMap(id => data.filter(article => article.id === id)));
  }
  if (popular.length < 3) {
    const { data, error } = await client.from('articles').select(cardFields).lte('published_at', now)
      .order('created_at', { ascending: false }).order('id').limit(3 + excluded.length + popular.length);
    if (error) throw error;
    popular.push(...data.filter(article => !excluded.includes(article.id) && !popular.some(item => item.id === article.id)).slice(0, 3 - popular.length));
  }
  return popular;
});

export const getHomeCover = cache(async (): Promise<ArticleCard | null> => {
  const client = publicClient();
  if (!client) return null;
  const { data, error } = await client.from('articles').select(cardFields).lte('published_at', new Date().toISOString())
    .order('featured', { ascending: false }).order('published_at', { ascending: false }).order('id').limit(1).maybeSingle();
  if (error) throw error;
  return data;
});

export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const client = publicClient();
  if (!client) return null;
  const { data, error } = await client.from('articles').select('*').eq('slug', slug)
    .lte('published_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data;
});

// Portadas de una categoría (de 1 a 3, en el orden elegido en el gestor).
// Sin portadas elegidas, o sin la migración aplicada, usa la noticia publicada más reciente.
export const getCategoryCovers = cache(async (category: string): Promise<ArticleCard[]> => {
  const client = publicClient();
  if (!client) return [];
  const now = new Date().toISOString();
  const { data, error } = await client.from('articles').select(cardFields).eq('category_id', category).lte('published_at', now)
    .gte('category_cover_position', 1).order('category_cover_position').limit(3);
  if (error && error.code !== '42703') throw error;
  if (data?.length) return data;
  const latest = await client.from('articles').select(cardFields).eq('category_id', category).lte('published_at', now)
    .order('published_at', { ascending: false }).order('id').limit(1);
  if (latest.error) throw latest.error;
  return latest.data;
});

// Portadas de inicio (hasta 3, las más recientes entre las marcadas). Sin elegidas, la publicada más reciente.
export const getHomeCovers = cache(async (): Promise<ArticleCard[]> => {
  const client = publicClient();
  if (!client) return [];
  const { data, error } = await client.from('articles').select(cardFields).lte('published_at', new Date().toISOString())
    .eq('featured', true).order('published_at', { ascending: false }).order('id').limit(3);
  if (error) throw error;
  if (data.length) return data;
  const latest = await getHomeCover();
  return latest ? [latest] : [];
});
