import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { loadWorkspace } from '@/lib/editorial-workspace-server';
import { EditorialPlanner } from '@/components/editorial-planner';
export default async function OrganizationPage() {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const [plans, ideas] = await Promise.all([loadWorkspace(client, 'plans'), loadWorkspace(client, 'ideas')]);
  return <EditorialPlanner initialPlans={plans} initialIdeas={ideas} />;
}
