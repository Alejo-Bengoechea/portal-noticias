import NewsManager from '../publicaciones/page';
import type { NewsQuery } from '@/lib/news-management';

export default async function DraftManager({ searchParams }: { searchParams: Promise<NewsQuery> }) {
  return <NewsManager searchParams={searchParams.then(params => ({ ...params, vista: 'borradores' }))} />;
}
