import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { loadWorkspace } from '@/lib/editorial-workspace-server';
import { SourceDirectory } from '@/components/source-directory';
export default async function SourcesPage() {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  return <SourceDirectory initial={await loadWorkspace(client, 'sources')} />;
}
