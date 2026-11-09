export const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const dateLabel = (value: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(new Date(value));
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
export function webUrl(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {}
}
export function youtubeId(value: unknown) {
  const safe = webUrl(value);
  if (!safe) return;
  const url = new URL(safe);
  const id = url.hostname === 'youtu.be' ? url.pathname.split('/')[1] :
    ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)
      ? url.searchParams.get('v') || /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1] : null;
  if (id && /^[\w-]{11}$/.test(id)) return id;
}
