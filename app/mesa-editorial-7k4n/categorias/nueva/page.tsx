import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { CategoryManager } from '@/components/category-manager';

export default async function NewCategory() {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const { data: categories, error } = await client.from('categories').select('id,name,slug,articles(count)').order('name');
  if (error) throw error;
  return <CategoryManager categories={(categories ?? []).map(category => ({ ...category,
    articleCount: ((category.articles as { count: number }[])[0]?.count ?? 0),
  }))} />;
}

