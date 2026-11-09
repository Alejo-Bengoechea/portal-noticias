import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { getTerms, type Article } from '@/lib/articles';
import { ArticleForm } from '@/components/article-form';
import { DeleteForm, TermForm } from '@/components/admin-forms';
import { JsonDropzone } from '@/components/json-dropzone';

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ borradorLocal?: string; borradoresLocales?: string }> }) {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const { id } = await params;
  if (id === 'nuevo') {
    const [categories, query] = await Promise.all([getTerms('categories'), searchParams]);
    return <JsonDropzone categories={categories} initialDraftId={typeof query.borradorLocal === 'string' ? query.borradorLocal : undefined} showDraftsInitially={query.borradoresLocales === '1'} />;
  }
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await client.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const article: Article = data;
  const [categories, tags] = await Promise.all([getTerms('categories'), getTerms('tags')]);
  return <><Link className="back" href="/mesa-editorial-7k4n/publicaciones">← Publicaciones</Link>
    <h1 className="page-title">Editar publicación</h1>
    <details className="panel article-terms">
      <summary>Crear una categoría o etiqueta</summary>
      <div className="admin-columns">
        <section><h2>Nueva categoría</h2><TermForm table="categories" /></section>
        <section><h2>Nueva etiqueta</h2><TermForm table="tags" /></section>
      </div>
    </details>
    <ArticleForm article={article} categories={categories} tags={tags} />
    <div className="delete-area"><DeleteForm id={article.id} /></div>
  </>;
}
