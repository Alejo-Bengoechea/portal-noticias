import { notFound } from 'next/navigation';
import { Cards, HeroStory, Pagination, pageNumber } from '@/components/cards';
import { CoverCarousel } from '@/components/cover-carousel';
import { articlePageSize, getArticles, getCategoryCovers, getTerms } from '@/lib/articles';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = (await getTerms('categories')).find(c => c.slug === slug);
  if (!category) notFound();
  return { title: category.name, description: `Noticias de ${category.name} · Alejo Bengoechea, periodismo y análisis.`, alternates: { canonical: `/categoria/${slug}` } };
}
export default async function Category({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = pageNumber((await searchParams).pagina);
  const categories = await getTerms('categories');
  const category = categories.find(c => c.slug === slug);
  if (!category) notFound();
  // Las portadas (1 a 3) se muestran arriba en la primera página y no se repiten en el listado.
  const covers = await getCategoryCovers(category.id);
  const articles = await getArticles(category.id, '', page, covers.map(cover => cover.id));
  return <><h1 className="page-title">{category.name}</h1>
    {page === 1 && covers.length > 0 && <div className="category-cover-area"><CoverCarousel label={`Portadas de ${category.name}`}>
      {covers.map((cover, i) => <HeroStory key={cover.id} article={cover} heading="h2" priority={i === 0} />)}
    </CoverCarousel></div>}
    {(articles.length > 0 || !covers.length || page > 1) && <Cards wide articles={articles.slice(0, articlePageSize)} categories={categories} />}
    <Pagination page={page} more={articles.length > articlePageSize} href={n => `/categoria/${slug}?pagina=${n}`} /></>;
}
