import 'server-only';

const graph = 'https://graph.facebook.com/v26.0/';
const username = 'alejobengo';

type GraphError = { code?: number };
type GraphPage<T> = { data?: T[]; paging?: { next?: string; previous?: string; cursors?: { after?: string; before?: string } } };
type Failure = 'network' | 'token' | 'permission' | 'limit' | 'unavailable';
type Result<T> = { ok: true; data: T } | { ok: false; reason: Failure; code?: number };
type Query = Record<string, string>;

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
  if (status === 429 || [4, 17, 32, 613].includes(code ?? 0)) return 'limit';
  if (status === 403 || code === 10 || (code != null && code >= 200 && code < 300)) return 'permission';
  return status >= 500 ? 'network' : 'unavailable';
}

async function request<T>(token: string, path: string, query: Query): Promise<Result<T>> {
  const url = new URL(path, graph);
  url.search = new URLSearchParams(query).toString();
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json() as (T & { error?: GraphError }) | null;
    if (!response.ok || !body || body.error) {
      const code = body?.error?.code;
      return { ok: false, reason: classify(response.status, code), code };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

const idPattern = /^\d{1,32}$/;
const isAccount = (account: Profile) => idPattern.test(account?.id) && account?.username?.toLowerCase() === username;

export async function connectInstagram() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return { status: 'setup' } as const;

  // An explicit account ID also works when the token cannot list assigned assets.
  let accountId = process.env.INSTAGRAM_ACCOUNT_ID?.trim();
  if (accountId && !idPattern.test(accountId)) return { status: 'invalid-id' } as const;
  if (!accountId) {
    let after: string | undefined;
    for (let page = 0; page < 10 && !accountId; page++) {
      const assigned: Result<GraphPage<Profile>> = await request(token, 'me/assigned_instagram_accounts', {
        fields: 'id,username', limit: '50', ...(after ? { after } : {}),
      });
      if (!assigned.ok) {
        const status = assigned.reason === 'permission' || assigned.reason === 'unavailable' ? 'discovery' : assigned.reason;
        return { status, code: assigned.code } as const;
      }
      accountId = assigned.data.data?.find(isAccount)?.id;
      const next = assigned.data.paging?.cursors?.after;
      if (accountId || !assigned.data.data?.length || !next || next === after) break;
      after = next;
    }
    if (!accountId) return { status: 'discovery' } as const;
  }
  const profile = await request<Profile>(token, accountId, {
    fields: 'id,username,followers_count,follows_count,media_count',
  });
  if (!profile.ok) return { status: profile.reason, code: profile.code } as const;
  if (!isAccount(profile.data) || profile.data.id !== accountId) return { status: 'wrong-account' } as const;
  return { status: 'connected', client: new InstagramClient(token, profile.data) } as const;
}

const totals = ['views', 'reach', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'replies', 'reposts', 'profile_views', 'profile_links_taps'];
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

function rowsOf(result: Result<GraphPage<Metric>>) {
  return result.ok ? result.data.data ?? [] : [];
}

const commonMediaMetrics = ['views', 'reach', 'total_interactions'];
const feedMetrics = ['likes', 'comments', 'saved', 'shares', 'reposts', 'follows', 'profile_visits', 'profile_activity'];
const reelMetrics = ['likes', 'comments', 'saved', 'shares', 'reposts', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time', 'reels_skip_rate', 'crossposted_views', 'facebook_views'];
const storyMetrics = ['replies', 'shares', 'follows', 'profile_visits', 'profile_activity', 'navigation', 'link_clicks'];

class InstagramClient {
  readonly #token: string;
  readonly profile: Profile;

  constructor(token: string, profile: Profile) {
    this.#token = token;
    this.profile = profile;
  }

  #get<T>(path: string, query: Query) {
    return request<T>(this.#token, path, query);
  }

  // A metric may be unsupported for a particular account or media format.
  // Try the common group first. Retry individual metrics only for a Graph validation error.
  async #metrics(path: string, metrics: string[], query: Query): Promise<Result<GraphPage<Metric>>> {
    const result = await this.#get<GraphPage<Metric>>(path, { ...query, metric: metrics.join(',') });
    if (result.ok || result.code !== 100 || metrics.length === 1) return result;
    const data: Metric[] = [];
    let firstSuccess = false;
    for (const metric of metrics) {
      const single = await this.#get<GraphPage<Metric>>(path, { ...query, metric });
      if (single.ok) {
        firstSuccess = true;
        data.push(...(single.data.data ?? []));
      } else if (single.reason === 'network' || single.reason === 'limit' || single.reason === 'token' || single.reason === 'permission') {
        return firstSuccess ? { ok: true, data: { data } } : single;
      }
    }
    return firstSuccess ? { ok: true, data: { data } } : result;
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
    return {
      totals: Object.fromEntries(rowsOf(total).map(metric => [metric.name, metricValue(metric)])),
      trend: rowsOf(trend).flatMap(metric => metric.values ?? []).flatMap(point =>
        point.end_time && Number.isFinite(Date.parse(point.end_time)) && number(point.value) !== null
          ? [{ date: point.end_time, value: point.value! }] : []).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
      growth: breakdownRows(rowsOf(growth)[0]),
      viewsByAudience: breakdownRows(rowsOf(viewsByAudience)[0]),
      reachByFormat: breakdownRows(rowsOf(reachByFormat)[0]),
      error: total.ok ? null : total.reason,
      since, until,
    };
  }

  async audience(group: 'follower' | 'reached_audience' | 'engaged_audience') {
    const path = `${this.profile.id}/insights`;
    return Promise.all(dimensions.map(async dimension => {
      const result = await this.#metrics(path, [`${group}_demographics`], {
        period: 'lifetime', metric_type: 'total_value', timeframe: 'this_month', breakdown: dimension,
      });
      return { dimension, rows: breakdownRows(rowsOf(result)[0]), error: result.ok ? null : result.reason };
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
    const format = stories ? storyMetrics : media.media_product_type === 'REELS' ? reelMetrics : feedMetrics;
    const [common, specialized, navigation] = await Promise.all([
      this.#metrics(path, commonMediaMetrics, {}),
      this.#metrics(path, format, {}),
      stories ? this.#metrics(path, ['navigation'], { breakdown: 'story_navigation_action_type' }) : null,
    ]);
    return {
      metrics: Object.fromEntries([...rowsOf(common), ...rowsOf(specialized)].map(metric => [metric.name, metricValue(metric)])),
      navigation: navigation ? breakdownRows(rowsOf(navigation)[0]) : [],
      error: common.ok || specialized.ok ? null : common.reason,
    };
  }
}
