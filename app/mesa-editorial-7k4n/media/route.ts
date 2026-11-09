import { adminClient } from '@/lib/supabase';
import { validImageSignature } from '@/lib/image-signature';

const formats: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const limit = 3 * 1024 * 1024;

export async function POST(request: Request) {
  const client = await adminClient();
  if (!client || request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }
  const length = Number(request.headers.get('content-length'));
  if (!length || length > limit + 65536) return Response.json({ error: 'La imagen supera los 3 MB.' }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !Object.hasOwn(formats, file.type) || !file.size || file.size > limit) {
    return Response.json({ error: 'Usa JPG, PNG, WebP o AVIF de hasta 3 MB.' }, { status: 400 });
  }
  if (!validImageSignature(new Uint8Array(await file.slice(0, 64).arrayBuffer()), file.type)) return Response.json({ error: 'El archivo no corresponde a una imagen válida del formato indicado.' }, { status: 400 });
  const path = `${crypto.randomUUID()}.${formats[file.type]}`;
  const bucket = client.storage.from('editorial');
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) return Response.json({ error: 'No se pudo subir la imagen.' }, { status: 502 });
  return Response.json({ url: bucket.getPublicUrl(path).data.publicUrl });
}
