export type ManagedNews = {
  id: string; title: string; slug: string; category_id: string | null;
  created_at: string | null; updated_at: string | null; published_at: string | null;
  ever_published: boolean; editorial_state?: string | null; featured: boolean;
};

