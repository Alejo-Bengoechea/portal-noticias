import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/format';
import { getTerms } from '@/lib/articles';
import { publicClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = publicClient();
  if (!client) return [];
  const categories = await getTerms('categories');
  const entries: MetadataRoute.Sitemap = [{ url: siteUrl.href }, ...categories.map(c => ({ url: new URL(`/categoria/${c.slug}`, siteUrl).href }))];
  const cutoff = new Date().toISOString();
  for (let start = 0; start < 49000; start += 500) {
    const { data, error } = await client.from('articles').select('slug').lte('published_at', cutoff).order('id').range(start, start + 499);
    if (error) throw error;
    entries.push(...data.map(a => ({ url: new URL(`/noticia/${a.slug}`, siteUrl).href })));
    if (data.length < 500) break;
  }
  return entries.slice(0, 50000);
}
