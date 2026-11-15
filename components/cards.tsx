import Link from 'next/link';
import type { ArticleCard, Term } from '@/lib/articles';
import { webUrl } from '@/lib/format';

const cardDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

export function Cover({ article, priority = false }: { article: Pick<ArticleCard, 'cover_url' | 'cover_alt' | 'category_id'>; priority?: boolean }) {
  const src = webUrl(article.cover_url);
  if (src) return <img className="cover" src={src} alt={article.cover_alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />;
  return <div className={`cover cover-art art-${article.category_id ?? '1'}`} aria-hidden="true"><span>AB<span>.</span></span></div>;
}

export function Card({ article, category }: { article: ArticleCard; category?: Term }) {
  return <article className="card">
    <Link className="card-cover-link" href={`/noticia/${article.slug}`} aria-label={`Leer ${article.title}`}><Cover article={article} /></Link>
    {category && <Link className="eyebrow accent" href={`/noticia/${article.slug}`}>{category.name}</Link>}
    <h3><Link href={`/noticia/${article.slug}`}>{article.title}</Link></h3>
    <p>{article.subtitle}</p>
    {article.published_at && <time dateTime={article.published_at}>{cardDate.format(new Date(article.published_at))}</time>}
  </article>;
}

// Patrón único (una sola vez): 1-3 / 4 / 2-1 / 3. No se muestran más noticias.
const archivePattern = [4, 4, 3, 3];

export function ArchiveCards({ articles, categories }: { articles: ArticleCard[]; categories: Term[] }) {
  const groups: React.ReactNode[] = [];
  let start = 0;
  archivePattern.forEach((size, index) => {
    const group = articles.slice(start, start + size);
    start += size;
    if (!group.length) return;
    groups.push(<div className={`archive-group archive-group-${index}`} key={group[0].id}>
      {group.map(article => <Card key={article.id} article={article} category={categories.find(category => category.id === article.category_id)} />)}
    </div>);
  });
  return <div className="archive-groups">{groups}</div>;
}

export function Cards({ articles, categories }: { articles: ArticleCard[]; categories: Term[] }) {
  if (!articles.length) return <p className="empty">No hay publicaciones para mostrar.</p>;
  return <div className="cards">{articles.map(article => <Card key={article.id} article={article} category={categories.find(c => c.id === article.category_id)} />)}</div>;
}

export function Pagination({ page, more, href }: { page: number; more: boolean; href: (page: number) => string }) {
  if (page === 1 && !more) return null;
  return <nav className="pagination" aria-label="Paginación">
    {page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}
    {more && <Link href={href(page + 1)}>Siguiente →</Link>}
  </nav>;
}

export function pageNumber(value: string | undefined) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 10000 ? number : 1;
}
