import 'server-only';

const graph = 'https://graph.facebook.com/v26.0/';
const username = 'alejobengo';

type GraphError = { code?: number; message?: string; error_user_msg?: string };
type GraphPage<T> = { data?: T[]; paging?: { next?: string; previous?: string; cursors?: { after?: string; before?: string } } };
type Failure = 'network' | 'token' | 'permission' | 'limit' | 'unavailable' | 'unsupported' | 'insufficient';
type Result<T> = { ok: true; data: T } | { ok: false; reason: Failure; code?: number; waitMinutes?: number };
type Query = Record<string, string>;
export type InsightStatus =
  | { state: 'ok' | 'empty' | 'unsupported' | 'insufficient' }
  | { state: 'error' | 'partial'; reason: Failure; waitMinutes?: number };

const cache = new Map<string, { expires: number; data: unknown }>();
const unsupported = new Set<string>();
let generation = 0;

export function refreshInstagram() {
  generation++;
  cache.clear();
  unsupported.clear();
}

async function readCached<T>(key: string, minutes: number, load: () => Promise<Result<T>>): Promise<Result<T>> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return { ok: true, data: cached.data as T };
  const started = generation;
  const result = await load();
  if (result.ok && generation === started) {
    const oldest = cache.keys().next().value;
    if (cache.size >= 256 && oldest !== undefined) cache.delete(oldest);
    cache.set(key, { expires: Date.now() + minutes * 60000, data: result.data });
  }
  return result;
}

type Profile = { id: string; username: string; followers_count?: number; follows_count?: number; media_count?: number };
export type InstagramMedia = {
  id: string; caption?: string; media_type?: string; media_product_type?: string; timestamp?: string;
  permalink?: string; like_count?: number; comments_count?: number;
};
type Breakdown = { results?: { dimension_values?: string[]; value?: number }[] };
type Metric = {
  name: string;
  values?: { value?: number; end_time?: string }[];
  total_value?: { value?: number; breakdowns?: Breakdown[] };
};

function classify(status: number, code?: number): Failure {
  if (code === 190 || code === 102 || status === 401) return 'token';
  if (status === 429 || [4, 17, 32, 613].includes(code ?? 0) || (code !== undefined && code >= 80000 && code <= 80014)) return 'limit';
  if (status === 403 || code === 10 || (code != null && code >= 200 && code < 300)) return 'permission';
  return status >= 500 ? 'network' : 'unavailable';
}

function retryMinutes(header: string | null) {
  if (!header) return undefined;
  try {
    const values: unknown = JSON.parse(header);
    if (!values || typeof values !== 'object') return undefined;
    const minutes = Object.values(values).flatMap(value => Array.isArray(value) ? value : [])
      .map(row => row?.estimated_time_to_regain_access)
      .filter(value => typeof value === 'number' && Number.isFinite(value) && value > 0);
    return minutes.length ? Math.ceil(Math.max(...minutes)) : undefined;
  } catch {
    return undefined;
  }
}

async function requestOnce<T>(token: string, path: string, query: Query, story: boolean): Promise<Result<T>> {
  const url = new URL(path, graph);
  url.search = new URLSearchParams(query).toString();
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json().catch(() => null) as (T & { error?: GraphError; paging?: GraphPage<unknown>['paging'] }) | null;
    if (!response.ok || !body || body.error) {
      const code = body?.error?.code;
      const message = [body?.error?.message, body?.error?.error_user_msg].join(' ');
      const reason = story && code === 10 && /not enough viewers|insufficient viewers|at least 5 viewers|espectadores suficientes/i.test(message)
        ? 'insufficient'
        : code === 100 && /not (?:a )?valid metric|unsupported metric|metric.{0,45}not supported (?:for|on) (?:this|the) (?:media type|product type|format)/i.test(message)
          ? 'unsupported' : classify(response.status, code);
      const waitMinutes = reason === 'limit' ? retryMinutes(response.headers.get('X-Business-Use-Case-Usage')) : undefined;
      return { ok: false, reason, code, ...(waitMinutes ? { waitMinutes } : {}) };
    }
    // Graph pagination URLs may contain credentials. Keep directions and cursors only.
    if (body.paging) body.paging = {
      cursors: body.paging.cursors,
      ...(body.paging.next ? { next: 'available' } : {}),
      ...(body.paging.previous ? { previous: 'available' } : {}),
    };
    return { ok: true, data: body };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

async function request<T>(token: string, path: string, query: Query, story = false): Promise<Result<T>> {
  const result = await requestOnce<T>(token, path, query, story);
  if (result.ok || result.reason !== 'network') return result;
  await new Promise(resolve => setTimeout(resolve, 150));
  return requestOnce<T>(token, path, query, story);
}

const idPattern = /^\d{1,32}$/;
const isAccount = (account: Profile) => idPattern.test(account?.id) && typeof account?.username === 'string' && account.username.toLowerCase() === username;

export async function connectInstagram() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return { status: 'setup' } as const;

  // An explicit account ID also works when the token cannot list assigned assets.
  let accountId = process.env.INSTAGRAM_ACCOUNT_ID?.trim();
  if (accountId && !idPattern.test(accountId)) return { status: 'invalid-id' } as const;
  if (!accountId) {
    const discovered = await readCached<string>('assigned-account', 5, async () => {
      let after: string | undefined;
      for (let page = 0; page < 10; page++) {
        const assigned: Result<GraphPage<Profile>> = await request(token, 'me/assigned_instagram_accounts', {
          fields: 'id,username', limit: '50', ...(after ? { after } : {}),
        });
        if (!assigned.ok) return assigned;
        const match = assigned.data.data?.find(isAccount);
        if (match) return { ok: true, data: match.id };
        const next = assigned.data.paging?.cursors?.after;
        if (!assigned.data.data?.length || !next || next === after) break;
        after = next;
      }
      return { ok: false, reason: 'unavailable' };
    });
    if (!discovered.ok) {
      const status = discovered.reason === 'permission' || discovered.reason === 'unavailable' ? 'discovery' : discovered.reason;
      return { status, code: discovered.code, ...(discovered.waitMinutes ? { waitMinutes: discovered.waitMinutes } : {}) } as const;
    }
    accountId = discovered.data;
  }
  const id = accountId;
  const profile = await readCached('profile:' + id, 1, () => request<Profile>(token, id, {
    fields: 'id,username,followers_count,follows_count,media_count',
  }));
  if (!profile.ok) return { status: profile.reason, code: profile.code, ...(profile.waitMinutes ? { waitMinutes: profile.waitMinutes } : {}) } as const;
  if (!isAccount(profile.data) || profile.data.id !== accountId) return { status: 'wrong-account' } as const;
  return { status: 'connected', client: new InstagramClient(token, profile.data) } as const;
}

const totals = ['views', 'reach', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'reposts', 'profile_links_taps'];
const dimensions = ['age', 'gender', 'city', 'country'] as const;

function number(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metricValue(metric: Metric) {
  return number(metric.total_value?.value) ?? number(metric.values?.at(-1)?.value);
}

function breakdownRows(metric?: Metric) {
  return (metric?.total_value?.breakdowns?.flatMap(item => item.results ?? []) ?? [])
    .flatMap(row => {
      const label = row.dimension_values?.join(' · ');
      const value = number(row.value);
      return label && value !== null ? [{ label, value }] : [];
    }).sort((a, b) => b.value - a.value);
}

type InsightBlock = { rows: Metric[]; requested: string[]; status: InsightStatus };
function failureStatus(reason: Failure, rows: Metric[], waitMinutes?: number): InsightStatus {
  if (rows.length) return { state: 'partial', reason, waitMinutes };
  if (reason === 'unsupported' || reason === 'insufficient') return { state: reason };
  return { state: 'error', reason, waitMinutes };
}

function breakdown(block: InsightBlock) {
  const rows = breakdownRows(block.rows[0]);
  return { rows, status: block.status.state === 'ok' && !rows.length ? { state: 'empty' } as const : block.status };
}

function values(block: InsightBlock): Record<string, number | null> {
  const received = new Map(block.rows.map(metric => [metric.name, metricValue(metric)]));
  return Object.fromEntries(block.requested.map(key => [key, received.get(key) ?? null]));
}

const commonMediaMetrics = ['views', 'reach', 'total_interactions'];
const feedMetrics = ['likes', 'comments', 'saved', 'shares', 'reposts', 'follows', 'profile_visits', 'profile_activity'];
const reelMetrics = ['likes', 'comments', 'saved', 'shares', 'reposts', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time', 'reels_skip_rate'];
const storyMetrics = ['shares', 'follows', 'profile_visits', 'profile_activity', 'navigation'];

class InstagramClient {
  readonly #token: string;
  readonly profile: Profile;

  constructor(token: string, profile: Profile) {
    this.#token = token;
    this.profile = profile;
  }

  #get<T>(path: string, query: Query, story = false) {
    const key = JSON.stringify([this.profile.id, path, query, story]);
    return readCached(key, 1, () => request<T>(this.#token, path, query, story));
  }

  async #metrics(path: string, requested: string[], query: Query, format?: string, split = true): Promise<InsightBlock> {
    const key = (metric: string) => JSON.stringify([this.profile.id, format, query.breakdown, metric]);
    const metrics = requested.filter(metric => !format || !unsupported.has(key(metric)));
    if (!metrics.length) return { rows: [], requested, status: { state: 'unsupported' } };
    const started = generation;
    const get = (list: string[]) => this.#get<GraphPage<Metric>>(path, { ...query, metric: list.join(',') }, format === 'story');
    const result = await get(metrics);
    let rejected = metrics.length !== requested.length;
    if (result.ok) {
      const rows = result.data.data ?? [];
      return { rows, requested, status: rejected ? failureStatus('unsupported', rows) : { state: rows.length ? 'ok' : 'empty' } };
    }

    if (result.code !== 100 || metrics.length === 1 || !split) {
      if (format && metrics.length === 1 && result.reason === 'unsupported' && generation === started) unsupported.add(key(metrics[0]));
      return { rows: [], requested, status: failureStatus(result.code === 100 ? 'unsupported' : result.reason, [], result.waitMinutes) };
    }

    const rows: Metric[] = [];
    for (const metric of metrics) {
      const single = await get([metric]);
      if (single.ok) {
        rows.push(...(single.data.data ?? []));
      } else if (single.code === 100) {
        rejected = true;
        if (format && single.reason === 'unsupported' && generation === started) unsupported.add(key(metric));
      } else {
        return { rows, requested, status: failureStatus(single.reason, rows, single.waitMinutes) };
      }
    }
    return { rows, requested, status: rejected ? failureStatus('unsupported', rows) : { state: rows.length ? 'ok' : 'empty' } };
  }

  async overview(days: number, now = new Date()) {
    const until = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
    const since = until - days * 86400;
    const query = { since: String(since), until: String(until), period: 'day' };
    const path = `${this.profile.id}/insights`;
    const [total, trend, growth, viewsByAudience, reachByFormat] = await Promise.all([
      this.#metrics(path, totals, { ...query, metric_type: 'total_value' }),
      this.#metrics(path, ['reach'], { ...query, metric_type: 'time_series' }),
      this.#metrics(path, ['follows_and_unfollows'], { ...query, metric_type: 'total_value', breakdown: 'follow_type' }),
      this.#metrics(path, ['views'], { ...query, metric_type: 'total_value', breakdown: 'follower_type' }),
      this.#metrics(path, ['reach'], { ...query, metric_type: 'total_value', breakdown: 'media_product_type' }),
    ]);
    const points = trend.rows.flatMap(metric => metric.values ?? []).flatMap(point =>
        point.end_time && Number.isFinite(Date.parse(point.end_time)) && number(point.value) !== null
          ? [{ date: point.end_time, value: point.value! }] : []).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const metrics = values(total);
    metrics.replies = null;
    return {
      totals: metrics,
      totalStatus: total.status,
      trend: { rows: points, status: trend.status.state === 'ok' && !points.length ? { state: 'empty' } as const : trend.status },
      growth: breakdown(growth),
      viewsByAudience: breakdown(viewsByAudience),
      reachByFormat: breakdown(reachByFormat),
      since, until,
    };
  }

  async audience(group: 'follower' | 'engaged_audience') {
    const path = `${this.profile.id}/insights`;
    return Promise.all(dimensions.map(async dimension => {
      const result = await this.#metrics(path, [`${group}_demographics`], {
        period: 'lifetime', metric_type: 'total_value', timeframe: 'this_month', breakdown: dimension,
      });
      return { dimension, ...breakdown(result) };
    }));
  }

  media(stories: boolean, page: { before?: string; after?: string }) {
    const fields = stories
      ? 'id,caption,media_type,media_product_type,timestamp,permalink'
      : 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count';
    return this.#get<GraphPage<InstagramMedia>>(`${this.profile.id}/${stories ? 'stories' : 'media'}`, { fields, limit: '20', ...page });
  }

  async mediaInsights(media: InstagramMedia, stories: boolean) {
    const path = `${media.id}/insights`;
    const format = stories ? 'story' : media.media_product_type === 'REELS' ? 'reel' : 'feed';
    const specific = format === 'story' ? storyMetrics : format === 'reel' ? reelMetrics : feedMetrics;
    const extra = stories ? ['link_clicks'] : format === 'reel' ? ['crossposted_views', 'facebook_views'] : [];
    const [common, specialized, optional, navigation] = await Promise.all([
      this.#metrics(path, commonMediaMetrics, {}, format),
      this.#metrics(path, specific, {}, format),
      extra.length ? this.#metrics(path, extra, {}, format, false) : null,
      stories ? this.#metrics(path, ['navigation'], { breakdown: 'story_navigation_action_type' }, format) : null,
    ]);
    return {
      blocks: [common, specialized, ...(optional ? [optional] : [])].map(block => ({ status: block.status, metrics: values(block) })),
      navigation: navigation ? breakdown(navigation) : null,
    };
  }
}
