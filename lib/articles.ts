import type { JSONContent } from '@tiptap/react';
import { cache } from 'react';
import { publicClient } from './supabase';

export type Term = { id: string; name: string; slug: string };
export type Article = {
  id: string; slug: string; title: string; subtitle: string; author: string;
  body: JSONContent; body_format: 'tiptap' | 'editorial'; category_id: string | null; tag_ids: string[]; cover_url: string | null;
  cover_alt: string; featured: boolean; published_at: string | null; ever_published?: boolean;
};
const categories = [
  { id: '1', name: 'España', slug: 'espana' },
  { id: '2', name: 'Internacional', slug: 'internacional' },
  { id: '3', name: 'Economía', slug: 'economia' },
];
const examples: Article[] = [
  ['las-ciudades-que-queremos', 'Las ciudades que queremos habitar', 'Una mirada a cómo el diseño de las calles transforma nuestra vida cotidiana.'],
  ['como-leer-las-noticias-del-mundo', 'Cómo leer las noticias del mundo con perspectiva', 'Tres preguntas para poner en contexto un titular internacional.'],
  ['bibliotecas-de-barrio', 'La segunda vida de las bibliotecas de barrio', 'Qué ocurre cuando una biblioteca se convierte en un lugar de encuentro.'],
  ['leer-la-inflacion', 'Cómo leer el dato de inflación', 'Por qué un promedio de precios puede contar una historia distinta a la de tu cesta de la compra.'],
].map(([slug, title, subtitle], index) => ({
  id: String(index + 1), slug, title, subtitle, author: 'Alejo Bengoechea', body_format: 'tiptap' as const,
  category_id: ['1', '2', '1', '3'][index], tag_ids: [], cover_url: null, cover_alt: '',
  featured: index === 0, published_at: '2026-11-06T12:00:00Z',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Esta pieza de demostración muestra cómo se verá una noticia publicada en el portal de Alejo Bengoechea.' }] }, { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'El contexto' }] }, { type: 'paragraph', content: [{ type: 'text', text: subtitle }] }] },
}));

export const getTerms = cache(async (table: 'categories' | 'tags'): Promise<Term[]> => {
  const client = publicClient();
  if (!client) return table === 'categories' ? categories.map(category => ({ ...category, name: category.name.toLocaleUpperCase('es') })) : [];
  const { data, error } = await client.from(table).select('*').order('name');
  if (error) throw error;
  return table === 'categories' ? data.map(term => ({ ...term, name: String(term.name).toLocaleUpperCase('es') })) : data;
});

export const getArticles = cache(async (category?: string, query = '', page = 1): Promise<Article[]> => {
  const client = publicClient();
  const start = (page - 1) * 12;
  const term = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (query && !term) return [];
  if (!client) return examples.filter(a => (!category || a.category_id === category) &&
    [a.title, a.subtitle].some(s => s.toLowerCase().includes(term.toLowerCase()))).slice(start, start + 13);
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
  if (!client) return examples[0];
  const { data, error } = await client.from('articles').select('*').eq('featured', true)
    .lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
});

export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const client = publicClient();
  if (!client) return examples.find(a => a.slug === slug) ?? null;
  const { data, error } = await client.from('articles').select('*').eq('slug', slug)
    .lte('published_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data;
});
