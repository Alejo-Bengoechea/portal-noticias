import { getTerms } from './articles';
import type { adminClient } from './supabase';

export type CoverOption = { id: string; title: string; cover_url: string | null; cover_alt: string; category_id: string; published_at: string; position: number | null };
export type CategoryCoverData = { categories: { id: string; name: string }[]; articles: CoverOption[]; homeIds: string[]; missing: boolean; error: boolean };

type Client = NonNullable<Awaited<ReturnType<typeof adminClient>>>;

// Noticias publicadas que el gestor puede elegir como portada de su categoría.
export async function categoryCoverData(client: Client, homeIds: string[] = []): Promise<CategoryCoverData> {
  const categories = await getTerms('categories').catch(() => []);
  const articles: CoverOption[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from('articles')
      .select('id,title,cover_url,cover_alt,category_id,published_at,position:category_cover_position')
      .not('category_id', 'is', null).lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }).order('id').range(start, start + 499);
    if (error) return { categories, articles: [], homeIds, missing: error.code === '42703', error: error.code !== '42703' };
    articles.push(...data as CoverOption[]);
    if (data.length < 500) break;
  }
  return { categories: categories.map(({ id, name }) => ({ id, name })), articles, homeIds, missing: false, error: false };
}
