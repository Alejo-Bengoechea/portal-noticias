import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { editorialHomeData } from '@/lib/editorial-home';
import { EditorialHome } from '@/components/editorial-home';

export default async function EditorialHomePage() {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  return <EditorialHome data={await editorialHomeData(client)} />;
}
