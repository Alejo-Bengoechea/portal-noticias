import type { SupabaseClient } from '@supabase/supabase-js';

export type MediaAsset = { path: string; url: string; size: number | null; mime: string; created: string; links: { id: string; title: string; cover: boolean }[] };

export async function mediaLibrary(client: SupabaseClient): Promise<MediaAsset[]> {
  const bucket = client.storage.from('editorial');
  const assets: MediaAsset[] = [];
  const folders = [''];
  for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
    const folder = folders[folderIndex];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(folder, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new Error('No se pudo leer Storage. Comprueba las políticas de la biblioteca multimedia.');
      for (const item of data ?? []) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        if (!item.id) { folders.push(path); continue; }
        assets.push({ path, url: bucket.getPublicUrl(path).data.publicUrl, size: typeof item.metadata?.size === 'number' ? item.metadata.size : null,
          mime: item.metadata?.mimetype ?? 'Tipo desconocido', created: item.created_at ?? '', links: [] });
      }
      if (!data || data.length < 100) break;
    }
  }
  const paths = new Map(assets.map(asset => [asset.path, asset]));
  const base = new URL(bucket.getPublicUrl('probe').data.publicUrl);
  function references(value: unknown, found: Set<string>) {
    if (typeof value === 'string') {
      // Also finds URLs embedded in HTML strings from older article bodies.
      for (const candidate of value.match(/https?:\/\/[^\s"'<>]+/g) ?? []) {
        try {
          const url = new URL(candidate);
          if (url.origin !== base.origin) continue;
          const match = url.pathname.match(/^\/storage\/v1\/(?:object\/(?:public|sign)|render\/image\/public)\/editorial\/(.+)$/);
          if (match) found.add(decodeURIComponent(match[1]));
        } catch { /* Not a URL belonging to this bucket. */ }
      }
    } else if (Array.isArray(value)) value.forEach(item => references(item, found));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => references(item, found));
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('articles').select('id,title,cover_url,body').order('id').range(offset, offset + 499);
    if (error) throw new Error('No se pudieron comprobar las noticias asociadas. No se mostrarán asociaciones incompletas.');
    for (const article of data ?? []) {
      const covers = new Set<string>(); const body = new Set<string>();
      references(article.cover_url, covers); references(article.body, body);
      for (const path of new Set([...covers, ...body])) paths.get(path)?.links.push({ id: article.id, title: article.title, cover: covers.has(path) });
    }
    if (!data || data.length < 500) break;
  }
  return assets.sort((a, b) => b.created.localeCompare(a.created));
}
