import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { mediaLibrary } from '@/lib/media-library';
import { MediaLibrary } from '@/components/media-library';

export default async function MultimediaPage() {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  try { return <MediaLibrary assets={await mediaLibrary(client)} />; }
  catch (error) { return <section className="media-library"><h1>Multimedia</h1><p role="alert">{error instanceof Error ? error.message : 'No se pudo cargar la biblioteca.'}</p></section>; }
}
