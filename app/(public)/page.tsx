import Link from 'next/link';
import { getHomeArticles, getHomeCover, getTerms } from '@/lib/articles';
import { ArchiveCards, Cards, Cover } from '@/components/cards';

export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };

export default async function Home() {
  const [cover, categories] = await Promise.all([getHomeCover(), getTerms('categories')]);
  const articles = await getHomeArticles(cover?.id);
  const hero = cover;
  const category = categories.find(category => category.id === hero?.category_id);
  return <>
    {hero && <article className="hero">
      <div className="hero-copy">
        <p className="eyebrow accent">PORTADA</p>
        {category && <Link className="eyebrow" href={`/noticia/${hero.slug}`}>{category.name}</Link>}
        <h1><Link href={`/noticia/${hero.slug}`}>{hero.title}</Link></h1>
        <p>{hero.subtitle}</p>
        <Link className="read" href={`/noticia/${hero.slug}`}>Leer el artículo <span aria-hidden>→</span></Link>
      </div>
      <Link className="hero-cover-link" href={`/noticia/${hero.slug}`} aria-label={`Leer ${hero.title}`}><Cover article={hero} priority /></Link>
    </article>}
    {(articles.length > 0 || !hero) && <section className="latest-section">
      {hero ? <h2 className="section-title">Lo más reciente</h2> : <h1 className="section-title">Lo más reciente</h1>}
      <Cards articles={articles.slice(0, 4)} categories={categories} />
    </section>}
    {articles.length > 0 && <section className="recent-section">
      <h2 className="section-title">Más populares</h2>
      <Cards articles={articles.slice(0, 3)} categories={categories} />
    </section>}
    {articles.length > 3 && <section className="archive-section">
      <h2 className="section-title">Últimas noticias</h2>
      <ArchiveCards articles={articles.slice(3)} categories={categories} />
    </section>}
    <section className="subscribe-section" aria-labelledby="subscribe-title">
      <div>
        <p className="eyebrow accent">Boletín</p>
        <h2 id="subscribe-title">Recibe el mejor periodismo en tu correo</h2>
        <p>Suscríbete a Alejo Bengoechea y no te pierdas ningún análisis ni reportaje. Sin ruido, solo lo importante.</p>
      </div>
      <form className="subscribe-form" autoComplete="off" onSubmit={undefined} action="#">
        <input type="email" name="email" placeholder="tu@correo.com" aria-label="Correo electrónico" autoComplete="off" disabled />
        <button type="button" disabled>Suscribirme</button>
      </form>
      <p className="subscribe-note">Próximamente. Puedes darte de baja cuando quieras.</p>
    </section>
  </>;
}
