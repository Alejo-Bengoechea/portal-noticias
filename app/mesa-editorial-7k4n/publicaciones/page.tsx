import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { getTerms } from '@/lib/articles';
import { InfiniteNewsManager } from '@/components/infinite-news-manager';
import { managedNewsBatch, type NewsQuery } from '@/lib/news-management';

export default async function NewsManager({ searchParams }: { searchParams: Promise<NewsQuery> }) {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const { data, count, categories, error, q, state, sort, sorting, drafts, view } = await managedNewsBatch(await searchParams, 0, client);
  const mode = 'reales';
  const base = drafts ? '/mesa-editorial-7k4n/borradores' : '/mesa-editorial-7k4n/publicaciones';
  const query = { q, estado: state, orden: sort, datos: mode, vista: view };
  const listKey = new URLSearchParams(query).toString();
  const sortHeader = (column: string, ascending: string, descending: string) => ({
    href: `${base}?${new URLSearchParams({ ...query, orden: sorting.column === column && sorting.ascending ? descending : ascending })}`,
    direction: sorting.column === column ? (sorting.ascending ? 'ascending' as const : 'descending' as const) : undefined,
  });
  return <>
    <h1 className="sr-only">{drafts ? 'Gestor de borradores' : 'Gestor de noticias'}</h1>
    <form autoComplete="off" className="news-manager-toolbar" action={base}>
      <input autoComplete="off" type="hidden" name="vista" value={view} />
      <input autoComplete="off" type="hidden" name="datos" value={mode} />
      <input autoComplete="off" type="hidden" name="orden" value={sort} />
      <input name="q" type="search" aria-label="Buscar noticias por nombre o ID completo" placeholder="Buscar por nombre o ID completo" defaultValue={q} autoComplete="off" maxLength={160} />
      {!drafts && <label className="manager-state-filter">Estado<select name="estado" defaultValue={state}><option value="">Todos los estados</option>
        <option value="publicado">Publicado</option><option value="despublicado">Despublicado</option>
      </select></label>}
      <button type="submit">Aplicar</button>
      {(q || (!drafts && state) || sort !== (drafts ? 'actualizadas' : 'recientes')) && <Link href={`${base}?${new URLSearchParams({ datos: mode, vista: view })}`}>Limpiar</Link>}
    </form>
    {error ? <p className="panel">Para habilitar esta tabla, aplica la migración 202611070004_news_management.sql en Supabase.</p> : <>
      <p className="manager-count">{count} {drafts ? 'borradores' : 'noticias creadas'}{q || (!drafts && state) ? ' encontrados' : ''}</p>
      <InfiniteNewsManager key={`${listKey}:${count}`} initialArticles={data} total={count} query={query} categories={categories} drafts={drafts} sortHeaders={{
        category: sortHeader('category(name)', 'categoria', 'categoria_desc'),
        created: sortHeader('created_at', 'antiguas', 'recientes'),
        updated: sortHeader('updated_at', 'actualizadas_asc', 'actualizadas'),
      }} />
      {!data.length && <p className="empty editorial-empty">{drafts ? 'No hay borradores que coincidan con esta búsqueda.' : 'No hay noticias creadas que coincidan con esta búsqueda.'}</p>}
    </>}
  </>;
}
