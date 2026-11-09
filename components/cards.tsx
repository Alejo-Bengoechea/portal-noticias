import Link from 'next/link';
import type { Article, Term } from '@/lib/articles';
import { dateLabel, webUrl } from '@/lib/format';

export function Cover({ article, priority = false }: { article: Article; priority?: boolean }) {
  const src = webUrl(article.cover_url);
  if (src) return <img className="cover" src={src} alt={article.cover_alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />;
  return <div className={`cover cover-art art-${article.category_id ?? '1'}`} aria-hidden="true"><span>AB<span>.</span></span></div>;
}

export function Card({ article, category }: { article: Article; category?: Term }) {
  return <article className="card">
    <Cover article={article} />
    {category && <Link className="eyebrow accent" href={`/categoria/${category.slug}`}>{category.name}</Link>}
    <h3><Link href={`/noticia/${article.slug}`}>{article.title}</Link></h3>
    <p>{article.subtitle}</p>
    {article.published_at && <time dateTime={article.published_at}>{dateLabel(article.published_at)}</time>}
  </article>;
}

export function Cards({ articles, categories }: { articles: Article[]; categories: Term[] }) {
  if (!articles.length) return <p className="empty">No hay publicaciones para mostrar.</p>;
  return <div className="cards">{articles.map(article => <Card key={article.id} article={article} category={categories.find(c => c.id === article.category_id)} />)}</div>;
}

export function Pagination({ page, more, href }: { page: number; more: boolean; href: (page: number) => string }) {
  return <nav className="pagination" aria-label="Paginación">
    {page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}
    {more && <Link href={href(page + 1)}>Siguiente →</Link>}
  </nav>;
}

export function pageNumber(value: string | undefined) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 10000 ? number : 1;
}
