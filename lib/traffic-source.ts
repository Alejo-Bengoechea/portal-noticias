// Reglas de la recogida de visitas. Sin cookies ni identificadores: solo se guarda
// la página vista y, en la primera página de cada visita, el tipo de canal de llegada.

export const trafficSources = ['buscadores', 'redes', 'otras', 'directo'] as const;
export type TrafficSource = typeof trafficSources[number];

const localHost = /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$|\.(localhost|test)$/i;

/**
 * Decide si se cuentan las visitas recibidas en este dominio.
 * Nunca cuenta el servidor local. Si `allowList` (variable TRAFFIC_HOSTS, separada por comas)
 * tiene valores, solo cuenta esos dominios; si está vacía, cuenta cualquier dominio publicado.
 */
export function isTrackedHost(hostname: string, allowList?: string | null) {
  const host = hostname.trim().toLowerCase();
  if (!host || localHost.test(host)) return false;
  const allowed = (allowList ?? '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(host);
}

const botAgent = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|monitor|curl|wget|python|httpclient/i;
export const isBotAgent = (userAgent: string | null) => !userAgent || botAgent.test(userAgent);

const searchNames = new Set(['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'yandex', 'baidu', 'qwant', 'startpage', 'naver', 'seznam', 'googlequicksearchbox']);
const socialNames = new Set(['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'whatsapp', 'telegram', 'pinterest', 'bsky', 'mastodon', 'twitter', 'x', 'snapchat', 'discord', 'twitch']);
const socialHosts = new Set(['t.co', 'lnkd.in', 'youtu.be', 't.me', 'wa.me', 'fb.me', 'm.me']);

/**
 * Clasifica el dominio de procedencia de una visita.
 * Devuelve null cuando viene del propio portal (no es una visita nueva).
 */
export function classifyEntry(referrerHost: string | null | undefined, ownHost: string): TrafficSource | null {
  const host = (referrerHost ?? '').trim().toLowerCase().replace(/^www\./, '');
  if (!host) return 'directo';
  if (!/^[a-z0-9.-]{1,253}$/.test(host)) return 'otras';
  if (host === ownHost.toLowerCase().replace(/^www\./, '')) return null;
  if (socialHosts.has(host)) return 'redes';
  if (host.startsWith('mail.')) return 'otras';
  const labels = host.split('.');
  // Las apps de Android envían el paquete (com.google.android.googlequicksearchbox).
  const names = labels[0] === 'com' || labels[0] === 'org' ? labels.slice(1) : labels.slice(0, -1);
  if (names.some(name => socialNames.has(name))) return 'redes';
  if (names.some(name => searchNames.has(name)) || host === 'search.brave.com') {
    return labels[0] === 'com' && !host.includes('googlequicksearchbox') ? 'otras' : 'buscadores';
  }
  return 'otras';
}
