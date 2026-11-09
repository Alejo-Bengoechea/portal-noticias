import { Cards, Pagination, pageNumber } from '@/components/cards';
import { getArticles, getTerms } from '@/lib/articles';

export const metadata = { title: 'Buscar noticias', robots: { index: false } };
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const page = pageNumber(params.pagina);
  const [articles, categories] = await Promise.all([getArticles(undefined, q, page), getTerms('categories')]);
  return <><h1 className="page-title">Buscar noticias</h1>
    <form autoComplete="off" className="search-form" action="/buscar"><label htmlFor="q">Palabras clave</label><div><input id="q" name="q" type="search" defaultValue={q} autoComplete="off" maxLength={100} /><button>Buscar</button></div></form>
    <h2 className="section-title">{q ? `Resultados para «${q}»` : 'Últimas noticias'}</h2>
    <Cards articles={articles.slice(0, 12)} categories={categories} />
    <Pagination page={page} more={articles.length > 12} href={n => `/buscar?q=${encodeURIComponent(q)}&pagina=${n}`} /></>;
}
