import { notFound } from 'next/navigation';
import { Cards, Pagination, pageNumber } from '@/components/cards';
import { getArticles, getTerms } from '@/lib/articles';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = (await getTerms('categories')).find(c => c.slug === slug);
  if (!category) notFound();
  return { title: category.name, description: `Noticias de ${category.name} en Alejo Dice.`, alternates: { canonical: `/categoria/${slug}` } };
}
export default async function Category({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = pageNumber((await searchParams).pagina);
  const categories = await getTerms('categories');
  const category = categories.find(c => c.slug === slug);
  if (!category) notFound();
  const articles = await getArticles(category.id, '', page);
  return <><h1 className="page-title">{category.name}</h1><Cards articles={articles.slice(0, 12)} categories={categories} />
    <Pagination page={page} more={articles.length > 12} href={n => `/categoria/${slug}?pagina=${n}`} /></>;
}
