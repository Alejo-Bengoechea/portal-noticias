import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export default async function Statistics() {
  if (!await adminClient()) redirect('/mesa-editorial-7k4n/login');
  return <AnalyticsDashboard />;
}
