import type { JSONContent } from '@tiptap/react';
import { cache } from 'react';
import { publicClient } from './supabase';

export type Term = { id: string; name: string; slug: string };
export type Article = {
  id: string; slug: string; title: string; subtitle: string; author: string;
  body: JSONContent; body_format: 'tiptap' | 'editorial'; category_id: string | null; tag_ids: string[]; cover_url: string | null;
  cover_alt: string; featured: boolean; published_at: string | null; ever_published?: boolean;
};
export const getTerms = cache(async (table: 'categories' | 'tags'): Promise<Term[]> => {
  const client = publicClient();
  if (!client) return [];
  const { data, error } = await client.from(table).select('*').order('name');
  if (error) throw error;
  return table === 'categories' ? data.map(term => ({ ...term, name: String(term.name).toLocaleUpperCase('es') })) : data;
});

export const getArticles = cache(async (category?: string, query = '', page = 1): Promise<Article[]> => {
  const client = publicClient();
  const start = (page - 1) * 12;
  const term = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (query && !term) return [];
  if (!client) return [];
  let request = client.from('articles').select('*').lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).order('id').range(start, start + 12);
  if (category) request = request.eq('category_id', category);
  if (term) request = request.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data;
});

export const getFeatured = cache(async (): Promise<Article | null> => {
  const client = publicClient();
  if (!client) return null;
  const { data, error } = await client.from('articles').select('*').eq('featured', true)
    .lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(1).maybeSingle();
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
