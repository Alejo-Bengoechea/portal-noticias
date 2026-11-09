import { adminClient } from '@/lib/supabase';
import type { Article, Term } from '@/lib/articles';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await adminClient();
  if (!client) return Response.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
  const [{ data, error }, categoriesResult, tagsResult] = await Promise.all([
    client.from('articles').select('*').eq('id', id).maybeSingle(),
    client.from('categories').select('*'),
    client.from('tags').select('*'),
  ]);
  if (error || categoriesResult.error || tagsResult.error) {
    return Response.json({ error: 'No se pudo descargar la noticia.' }, { status: 503 });
  }
  if (!data) return new Response(null, { status: 404 });
  const article = data as Article & { created_at?: string | null; updated_at?: string | null; ever_published?: boolean };
  const categories = categoriesResult.data as Term[];
  const tags = tagsResult.data as Term[];
  const json = {
    versionEsquema: '1.0.0',
    metadatos: {
      id: article.id, slug: article.slug, idioma: 'es',
      estado: article.published_at ? 'publicado' : article.ever_published ? 'despublicado' : 'borrador',
      seccion: categories.find(term => term.id === article.category_id)?.name ?? '',
      etiquetas: tags.filter(term => article.tag_ids.includes(term.id)).map(term => term.name),
      destacada: article.featured,
    },
    fechas: { creacion: article.created_at ?? null, actualizacion: article.updated_at ?? null, publicacion: article.published_at },
    titular: article.title, subtitulo: article.subtitle, autores: [{ nombre: article.author }],
    portada: article.cover_url ? { recursoId: 'portada' } : null,
    recursos: article.cover_url ? { portada: { tipo: 'imagen', url: article.cover_url, alt: article.cover_alt } } : {},
    cuerpo: [{ id: 'contenido', tipo: 'tiptap', contenido: article.body }],
    presentacion: { mostrarFirma: true, mostrarFechaActualizacion: true, embeds: { habilitados: true } },
  };
  return new Response(JSON.stringify(json, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="noticia-${id}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
