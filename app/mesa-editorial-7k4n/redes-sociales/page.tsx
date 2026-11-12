import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { SocialDashboard } from '@/components/social-dashboard';

export default async function SocialMediaPage() {
  if (!await adminClient()) redirect('/mesa-editorial-7k4n/login');
  return <SocialDashboard />;
}
