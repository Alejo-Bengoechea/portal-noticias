import { getHomeArticles, getHomeCovers, getPopularArticles, getTerms } from '@/lib/articles';
import { ArchiveCards, Cards, HeroStory } from '@/components/cards';
import { CoverCarousel } from '@/components/cover-carousel';

export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };

export default async function Home() {
  const [covers, categories] = await Promise.all([getHomeCovers(), getTerms('categories')]);
  const [articles, popular] = await Promise.all([getHomeArticles(covers.map(cover => cover.id)), getPopularArticles(covers.map(cover => cover.id))]);
  const hero = covers[0];
  return <>
    {covers.length === 1 && <HeroStory article={hero} category={categories.find(c => c.id === hero.category_id)} />}
    {covers.length > 1 && <CoverCarousel label="Portadas de inicio">
      {covers.map((cover, i) => <HeroStory key={cover.id} article={cover} category={categories.find(c => c.id === cover.category_id)} heading={i === 0 ? 'h1' : 'h2'} priority={i === 0} />)}
    </CoverCarousel>}
    {(articles.length > 0 || !hero) && <section className="latest-section">
      {hero ? <h2 className="section-title">Lo más reciente</h2> : <h1 className="section-title">Lo más reciente</h1>}
      <Cards articles={articles.slice(0, 4)} categories={categories} />
    </section>}
    {popular.length > 0 && <section className="recent-section">
      <h2 className="section-title">Más populares</h2>
      <Cards articles={popular} categories={categories} />
    </section>}
    {articles.length > 4 && <section className="archive-section">
      <h2 className="section-title">Últimas noticias</h2>
      <ArchiveCards articles={articles.slice(4)} categories={categories} />
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
