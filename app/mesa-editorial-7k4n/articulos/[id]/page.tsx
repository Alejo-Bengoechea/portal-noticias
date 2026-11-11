import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { getTerms, type Article } from '@/lib/articles';
import { ArticleForm } from '@/components/article-form';
import { DeleteForm, TermForm } from '@/components/admin-forms';
import { JsonDropzone } from '@/components/json-dropzone';
import { normalizeNewsDocument } from '@/lib/news-import';
import type { NewsDocument } from '@/lib/news-components';
import type { SupabaseClient } from '@supabase/supabase-js';

async function loadDraftPicker(client: SupabaseClient) {
  try {
    const { data, error } = await client.from('articles').select('id,title')
      .eq('body_format', 'editorial').is('published_at', null).eq('ever_published', false)
      .or('body->metadatos->>estado.is.null,body->metadatos->>estado.neq.despublicado')
      .order('updated_at', { ascending: false }).limit(100);
    if (!error) return { drafts: data ?? [] };
  } catch {
    // Un fallo de red en el selector no impide abrir el editor.
  }
  return { draftsUnavailable: true };
}

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const client = await adminClient();
  if (!client) redirect('/mesa-editorial-7k4n/login');
  const { id } = await params;
  if (id === 'nuevo') {
    const [categories, draftPicker] = await Promise.all([getTerms('categories'), loadDraftPicker(client)]);
    return <JsonDropzone {...draftPicker} categories={categories} />;
  }
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await client.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const article: Article = data;
  if (article.body_format === 'editorial') {
    const [categories, draftPicker] = await Promise.all([getTerms('categories'), loadDraftPicker(client)]);
    const news = normalizeNewsDocument(structuredClone(article.body) as NewsDocument);
    return <>
      <JsonDropzone {...draftPicker} categories={categories} article={{ draft: !article.published_at && !article.ever_published && (news.metadatos as NewsDocument)?.estado !== 'despublicado', id: article.id, name: `${article.slug}.json`, news }} />
      <div className="delete-area"><DeleteForm id={article.id} /></div>
    </>;
  }
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
