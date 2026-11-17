import type { SupabaseClient } from '@supabase/supabase-js';
import { trafficSources, type TrafficSource } from '@/lib/traffic-source';

export const audiencePeriods = [7, 30] as const;
export type AudiencePeriod = typeof audiencePeriods[number];
export type AudienceStatus = 'ok' | 'missing' | 'error';
export type AudienceDay = { key: string; label: string };
export type AudienceArticle = { id: string; title: string; category: string; views: number[] };
export type AudienceTopArticle = { id: string; title: string; views: number };
export type AudienceCategory = {
  id: string; name: string; color: string; articleViews: number[]; pageViews: number; published: number;
  topArticles: AudienceTopArticle[]; articlesWithViews: number;
};
export type AudienceSource = { key: TrafficSource; name: string; color: string; visits: number };
export type AudienceData = {
  status: AudienceStatus;
  sourcesStatus: AudienceStatus;
  period: AudiencePeriod;
  days: AudienceDay[];
  since: string | null;
  portalViews: number[];
  portalVisits: number[];
  articles: AudienceArticle[];
  categories: AudienceCategory[];
  sources: AudienceSource[];
};

type ViewRow = { day: string; page_key: string; views: number | string };
type SourceRow = { day: string; source: string; visits: number | string };

const palette = ['#b9a0ff', '#78e3c3', '#f1b77a', '#80bfff', '#ff9fb2', '#d6e37a', '#9fd8ff', '#e0b0ff'];
export const sourceLabels: Record<TrafficSource, { name: string; color: string }> = {
  buscadores: { name: 'Buscadores', color: '#b9a0ff' },
  redes: { name: 'Redes sociales', color: '#78e3c3' },
  directo: { name: 'Acceso directo', color: '#f1b77a' },
  otras: { name: 'Otras webs', color: '#80bfff' },
};

export const parsePeriod = (value: string | string[] | undefined): AudiencePeriod => value === '30' ? 30 : 7;

/** Fecha de hoy en Madrid (AAAA-MM-DD), la misma zona que usa la base de datos al contar. */
export const madridToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now);

/** Los últimos `count` días de Madrid, del más antiguo a hoy. Cálculo en UTC para evitar saltos de horario. */
export function audienceDays(count: number, now = new Date()): AudienceDay[] {
  const [year, month, day] = madridToday(now).split('-').map(Number);
  const short = new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
  const numeric = new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1, day - (count - 1 - i)));
    return { key: date.toISOString().slice(0, 10), label: (count <= 7 ? short : numeric).format(date).replace('.', '') };
  });
}

const missing = (code?: string) => code === '42P01' || code === 'PGRST205';
const statusOf = (error: { code?: string } | null): AudienceStatus => !error ? 'ok' : missing(error.code) ? 'missing' : 'error';

/** Agrupa las filas diarias en series por página, con un valor por día del periodo. */
export function buildSeries(rows: ViewRow[], days: AudienceDay[]) {
  const index = new Map(days.map((day, i) => [day.key, i]));
  const byKey = new Map<string, number[]>();
  const total = days.map(() => 0);
  for (const row of rows) {
    const i = index.get(row.day);
    if (i === undefined) continue;
    const views = Number(row.views) || 0;
    if (!byKey.has(row.page_key)) byKey.set(row.page_key, days.map(() => 0));
    byKey.get(row.page_key)![i] += views;
    total[i] += views;
  }
  return { byKey, total };
}

export function buildSources(rows: SourceRow[], days: AudienceDay[]) {
  const index = new Map(days.map((day, i) => [day.key, i]));
  const visits = days.map(() => 0);
  const counts = new Map<TrafficSource, number>(trafficSources.map(source => [source, 0]));
  for (const row of rows) {
    const i = index.get(row.day);
    if (i === undefined || !counts.has(row.source as TrafficSource)) continue;
    const value = Number(row.visits) || 0;
    visits[i] += value;
    counts.set(row.source as TrafficSource, counts.get(row.source as TrafficSource)! + value);
  }
  const sources = trafficSources.map(key => ({ key, ...sourceLabels[key], visits: counts.get(key)! }))
    .sort((a, b) => b.visits - a.visits);
  return { visits, sources };
}

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return { rows, error: null };
  }
}

export async function getAudience(client: SupabaseClient, period: AudiencePeriod, now = new Date()): Promise<AudienceData> {
  const days = audienceDays(period, now);
  const start = days[0].key;
  const empty: AudienceData = {
    status: 'ok', sourcesStatus: 'ok', period, days, since: null,
    portalViews: days.map(() => 0), portalVisits: days.map(() => 0), articles: [], categories: [],
    sources: trafficSources.map(key => ({ key, ...sourceLabels[key], visits: 0 })),
  };

  const [views, sources, first] = await Promise.all([
    readAll<ViewRow>((from, to) => client.from('editorial_page_views').select('day,page_key,views').gte('day', start).order('day').order('page_key').range(from, to)),
    client.from('editorial_traffic_sources').select('day,source,visits').gte('day', start),
    client.from('editorial_page_views').select('day').order('day').limit(1),
  ]);
  const status = statusOf(views.error);
  if (status !== 'ok') return { ...empty, status, sourcesStatus: statusOf(sources.error) };

  const { byKey, total } = buildSeries(views.rows, days);
  const sourcesStatus = statusOf(sources.error);
  const entries = sourcesStatus === 'ok' ? buildSources((sources.data ?? []) as SourceRow[], days) : null;

  const articleIds = [...byKey.keys()].filter(key => key.startsWith('article:')).map(key => key.slice(8));
  const [categoriesResult, published, ...articleChunks] = await Promise.all([
    client.from('categories').select('id,name').order('name'),
    readAll<{ category_id: string | null }>((from, to) => client.from('articles').select('category_id').lte('published_at', now.toISOString()).order('id').range(from, to)),
    ...Array.from({ length: Math.ceil(articleIds.length / 100) }, (_, i) =>
      client.from('articles').select('id,title,category_id').in('id', articleIds.slice(i * 100, i * 100 + 100))),
  ]);
  const failure = categoriesResult.error ?? published.error ?? articleChunks.find(chunk => chunk.error)?.error ?? null;
  if (failure) return { ...empty, status: 'error' };

  const categoryRows = (categoriesResult.data ?? []) as { id: string; name: string }[];
  const categoryName = new Map(categoryRows.map(row => [row.id, String(row.name).toLocaleUpperCase('es')]));
  const articleRows = articleChunks.flatMap(chunk => (chunk.data ?? []) as { id: string; title: string; category_id: string | null }[]);

  const articles: AudienceArticle[] = articleRows.map(row => ({
    id: row.id, title: row.title || 'Sin título',
    category: (row.category_id && categoryName.get(row.category_id)) || 'SIN CATEGORÍA',
    views: byKey.get(`article:${row.id}`)!,
  })).sort((a, b) => sum(b.views) - sum(a.views) || a.title.localeCompare(b.title, 'es'));

  const publishedCount = new Map<string, number>();
  for (const row of published.rows) if (row.category_id) publishedCount.set(row.category_id, (publishedCount.get(row.category_id) ?? 0) + 1);

  const categories: AudienceCategory[] = categoryRows.map((row, i) => {
    const articleViews = days.map(() => 0);
    const own = articles.filter(article => articleRows.find(item => item.id === article.id)?.category_id === row.id);
    for (const article of own) article.views.forEach((value, day) => { articleViews[day] += value; });
    const withViews = own.filter(article => sum(article.views) > 0);
    return {
      id: row.id, name: categoryName.get(row.id)!, color: palette[i % palette.length], articleViews,
      pageViews: sum(byKey.get(`category:${row.id}`) ?? []), published: publishedCount.get(row.id) ?? 0,
      // `articles` ya viene ordenado por vistas: las primeras son las más vistas.
      topArticles: withViews.slice(0, 3).map(article => ({ id: article.id, title: article.title, views: sum(article.views) })),
      articlesWithViews: withViews.length,
    };
  }).sort((a, b) => sum(b.articleViews) + b.pageViews - sum(a.articleViews) - a.pageViews);

  return {
    ...empty, sourcesStatus, since: first.data?.[0]?.day ?? null, portalViews: total,
    portalVisits: entries?.visits ?? empty.portalVisits, articles, categories,
    sources: entries?.sources ?? empty.sources,
  };
}

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
