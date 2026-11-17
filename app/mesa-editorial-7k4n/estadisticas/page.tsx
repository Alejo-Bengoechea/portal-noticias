import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { getAudience, parsePeriod } from '@/lib/audience';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

type Props = { searchParams: Promise<{ dias?: string | string[] }> };

export default async function Statistics({ searchParams }: Props) {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const data = await getAudience(client, parsePeriod((await searchParams).dias));
  return <AnalyticsDashboard data={data} />;
}
