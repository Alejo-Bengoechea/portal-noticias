import Link from 'next/link';
import { getArticles, getFeatured, getTerms } from '@/lib/articles';
import { Cards, Cover, pageNumber, Pagination } from '@/components/cards';

export const revalidate = 60;
export const metadata = { alternates: { canonical: '/' } };

export default async function Home({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const page = pageNumber((await searchParams).pagina);
  const [articles, featured, categories] = await Promise.all([getArticles(undefined, '', page), getFeatured(), getTerms('categories')]);
  const hero = page === 1 ? featured ?? articles[0] : null;
  return <>
    {hero && <article className="hero">
      <div className="hero-copy">
        <p className="eyebrow accent">Portada</p>
        <h1><Link href={`/noticia/${hero.slug}`}>{hero.title}</Link></h1>
        <p>{hero.subtitle}</p>
        <Link className="read" href={`/noticia/${hero.slug}`}>Leer la noticia <span aria-hidden>→</span></Link>
      </div>
      <Cover article={hero} priority />
    </article>}
    <section><h2 className="section-title">Últimas noticias</h2>
      <Cards articles={articles.slice(0, 12).filter(a => a.id !== hero?.id || articles.length === 1)} categories={categories} />
      <Pagination page={page} more={articles.length > 12} href={n => `/?pagina=${n}`} />
    </section>
  </>;
}
