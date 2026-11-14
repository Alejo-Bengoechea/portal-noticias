import Link from 'next/link';
import { articlePageSize, getArticles, getHomeCover, getTerms } from '@/lib/articles';
import { Cards, Cover, pageNumber, Pagination } from '@/components/cards';

export const revalidate = 60;
export const metadata = { alternates: { canonical: '/' } };

export default async function Home({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const page = pageNumber((await searchParams).pagina);
  const [cover, categories] = await Promise.all([getHomeCover(), getTerms('categories')]);
  const articles = await getArticles(undefined, '', page, cover?.id);
  const hero = page === 1 ? cover : null;
  const category = categories.find(category => category.id === hero?.category_id);
  return <>
    {hero && <article className="hero">
      <div className="hero-copy">
        <p className="eyebrow accent">Portada</p>
        {category && <Link className="eyebrow" href={`/categoria/${category.slug}`}>{category.name}</Link>}
        <h1><Link href={`/noticia/${hero.slug}`}>{hero.title}</Link></h1>
        <p>{hero.subtitle}</p>
        <Link className="read" href={`/noticia/${hero.slug}`}>Leer la noticia <span aria-hidden>→</span></Link>
      </div>
      <Cover article={hero} priority />
    </article>}
    {(articles.length > 0 || !hero) && <section>
      {hero ? <h2 className="section-title">Últimas noticias</h2> : <h1 className="section-title">Últimas noticias</h1>}
      <Cards articles={articles.slice(0, articlePageSize)} categories={categories} />
      <Pagination page={page} more={articles.length > articlePageSize} href={n => `/?pagina=${n}`} />
    </section>}
  </>;
}
