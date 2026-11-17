import { publicClient } from '@/lib/supabase';
import { classifyEntry, isBotAgent, isTrackedHost } from '@/lib/traffic-source';

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) {
    return new Response(null, { status: 403 });
  }
  // Solo se cuenta el portal publicado (nunca localhost) y no se cuentan robots.
  if (!isTrackedHost(url.hostname, process.env.TRAFFIC_HOSTS) || isBotAgent(request.headers.get('user-agent'))) {
    return new Response(null, { status: 204 });
  }
  const client = publicClient();
  if (!client) return new Response(null, { status: 204 });
  const path = url.searchParams.get('path');
  if (!path || path.length > 220) return new Response(null, { status: 400 });
  const entry = url.searchParams.get('entry') === '1' ? classifyEntry(url.searchParams.get('ref'), url.hostname) : null;
  let { error } = await client.rpc('record_editorial_visit', { page_path: path, entry_source: entry });
  // Sin la migración de audiencia, se sigue contando la vista con la función anterior.
  if (error && (error.code === 'PGRST202' || error.code === '42883')) {
    ({ error } = await client.rpc('record_editorial_view', { page_path: path }));
  }
  return new Response(null, { status: error ? 503 : 204 });
}
