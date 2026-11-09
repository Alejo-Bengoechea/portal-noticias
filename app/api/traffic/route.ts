import { publicClient } from '@/lib/supabase';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  const client = publicClient();
  if (!client) return new Response(null, { status: 204 });
  const path = new URL(request.url).searchParams.get('path');
  if (!path || path.length > 220) return new Response(null, { status: 400 });
  const { error } = await client.rpc('record_editorial_view', { page_path: path });
  return new Response(null, { status: error ? 503 : 204 });
}
