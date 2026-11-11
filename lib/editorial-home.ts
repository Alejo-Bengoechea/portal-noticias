import type { SupabaseClient } from '@supabase/supabase-js';

export type HomeDraft = { id: string; title: string; updatedAt: string | null; category: string };
export type HomeCover = { id: string; slug: string; title: string; subtitle: string; coverUrl: string | null; coverAlt: string; publishedAt: string; category: string; featured: boolean };
export type EditorialHomeData = { counts: { published: number | null; unpublished: number | null; drafts: number | null }; drafts: HomeDraft[]; cover: HomeCover | null; errors: { counts: boolean; drafts: boolean; cover: boolean } };

function categoryName(value: unknown) {
  const category = Array.isArray(value) ? value[0] : value;
  return category && typeof category === 'object' && typeof category.name === 'string' ? category.name.toLocaleUpperCase('es') : 'Sin categoría';
}

export async function editorialHomeData(client: SupabaseClient): Promise<EditorialHomeData> {
  const now = new Date().toISOString();
  const fields = 'id,slug,title,subtitle,cover_url,cover_alt,published_at,featured,category:categories(name)';
  const [published, unpublished, draftCount, recent, featured, latest] = await Promise.all([
    client.from('articles').select('id', { count: 'exact', head: true }).not('published_at', 'is', null),
    client.from('articles').select('id', { count: 'exact', head: true }).is('published_at', null).or('ever_published.eq.true,body->metadatos->>estado.eq.despublicado'),
    client.from('articles').select('id', { count: 'exact', head: true }).is('published_at', null).eq('ever_published', false).or('body->metadatos->>estado.is.null,body->metadatos->>estado.neq.despublicado'),
    client.from('articles').select('id,title,updated_at,category:categories(name)').is('published_at', null).eq('ever_published', false).or('body->metadatos->>estado.is.null,body->metadatos->>estado.neq.despublicado').order('updated_at', { ascending: false, nullsFirst: false }).order('id').limit(6),
    client.from('articles').select(fields).eq('featured', true).lte('published_at', now).order('published_at', { ascending: false }).order('id').limit(1).maybeSingle(),
    client.from('articles').select(fields).lte('published_at', now).order('published_at', { ascending: false }).order('id').limit(1).maybeSingle(),
  ]);
  const coverError = Boolean(featured.error || latest.error);
  const story = coverError ? null : featured.data ?? latest.data;
  return {
    counts: { published: published.error ? null : published.count, unpublished: unpublished.error ? null : unpublished.count, drafts: draftCount.error ? null : draftCount.count },
    drafts: recent.error ? [] : (recent.data ?? []).map(draft => ({ id: draft.id, title: draft.title, updatedAt: draft.updated_at, category: categoryName(draft.category) })),
    cover: story ? { id: story.id, slug: story.slug, title: story.title, subtitle: story.subtitle, coverUrl: story.cover_url, coverAlt: story.cover_alt ?? '', publishedAt: story.published_at, category: categoryName(story.category), featured: story.featured } : null,
    errors: { counts: Boolean(published.error || unpublished.error || draftCount.error), drafts: Boolean(recent.error), cover: coverError },
  };
}
