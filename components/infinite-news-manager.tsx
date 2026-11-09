'use client';

import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { NewsManagerTable } from './news-manager-table';
import { loadMoreNews } from '@/app/mesa-editorial-7k4n/news-actions';
import type { NewsQuery } from '@/lib/news-management';
import type { ManagedNews } from '@/lib/news-manager-demo';

export function InfiniteNewsManager({ initialArticles, total, query, ...tableProps }: {
  initialArticles: ManagedNews[]; total: number; query: NewsQuery;
} & Omit<ComponentProps<typeof NewsManagerTable>, 'articles'>) {
  const [articles, setArticles] = useState(initialArticles);
  const [remainingTotal, setTotal] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const offset = useRef(initialArticles.length);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setArticles(initialArticles);
    offset.current = initialArticles.length;
    setTotal(total);
    setError('');
  }, [initialArticles, total]);
  const hasMore = offset.current < remainingTotal;
  const load = useCallback(async () => {
    if (busy.current || offset.current >= remainingTotal) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await loadMoreNews(query, offset.current);
      if (result.error) { setError(result.error); return; }
      offset.current += result.articles.length;
      setTotal(result.articles.length ? result.total : offset.current);
      setArticles(previous => {
        const ids = new Set(previous.map(article => article.id));
        return [...previous, ...result.articles.filter(article => !ids.has(article.id))];
      });
    } catch { setError('No se pudieron cargar las noticias. Inténtalo de nuevo.'); }
    finally { busy.current = false; setLoading(false); }
  }, [query, remainingTotal]);
  useEffect(() => {
    if (!hasMore || error || !sentinel.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 1)) void load();
    }, { rootMargin: '0px', threshold: 1 });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, error, load, articles.length]);
  return <>
    <NewsManagerTable articles={articles} {...tableProps} />
    <div ref={sentinel} className="manager-load-more" role="status" aria-live="polite">
      {error ? <>{error}<button type="button" onClick={() => void load()}>Reintentar</button></>
        : loading ? 'Cargando 15 noticias más…' : hasMore ? 'Desplázate hasta el final para cargar más noticias.' : `${articles.length} noticias cargadas.`}
    </div>
  </>;
}
