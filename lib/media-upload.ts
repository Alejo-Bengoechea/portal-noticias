import { webUrl } from './format';

export const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const maxImageSize = 3 * 1024 * 1024;

export async function uploadEditorialImage(file: File, signal?: AbortSignal): Promise<string> {
  if (!imageTypes.includes(file.type) || !file.size || file.size > maxImageSize) throw new Error('Usa JPG, PNG, WebP o AVIF de hasta 3 MB.');
  const body = new FormData();
  body.set('file', file);
  const response = await fetch('/mesa-editorial-7k4n/media', { method: 'POST', body, credentials: 'same-origin', signal });
  const result = await response.json().catch(() => ({}));
  const url = webUrl(result.url);
  if (!response.ok || !url) throw new Error(result.error || 'No se pudo subir la imagen.');
  return url;
}
