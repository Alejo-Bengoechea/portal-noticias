'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminClient, sessionClient } from '@/lib/supabase';
import { slugify, webUrl } from '@/lib/format';
import { demoCategoryCount } from '@/lib/news-manager-demo';

const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function login(_: string, form: FormData): Promise<string> {
  const client = await sessionClient();
  if (!client || !process.env.ADMIN_USER_ID) return 'Configura Supabase y el identificador del administrador.';
  const { data, error } = await client.auth.signInWithPassword({ email: field(form, 'email'), password: String(form.get('password') ?? '') });
  if (error) return 'No se pudo iniciar sesión con esas credenciales.';
  const allowed = data.user?.id === process.env.ADMIN_USER_ID && (await client.rpc('is_editorial_admin')).data === true;
  if (!allowed) {
    await client.auth.signOut();
    return 'No se pudo iniciar sesión con esas credenciales.';
  }
  redirect('/mesa-editorial-7k4n');
}

export async function logout() {
  const client = await sessionClient();
  await client?.auth.signOut();
  redirect('/mesa-editorial-7k4n/login');
}

export async function saveArticle(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  if (!client) return 'Tu sesión no permite guardar publicaciones.';
  const id = field(form, 'id');
  const title = field(form, 'title');
  const subtitle = field(form, 'subtitle');
  const author = field(form, 'author');
  const slug = slugify(field(form, 'slug') || title);
  const category = field(form, 'category');
  const cover = field(form, 'cover');
  const coverAlt = field(form, 'coverAlt');
  const tagIds = [...new Set(form.getAll('tags').map(String))];
  if ((id && !uuid.test(id)) || (category && !uuid.test(category)) || tagIds.length > 3 || tagIds.some(tag => !uuid.test(tag))) return 'Selección no válida. Cada noticia admite un máximo de 3 etiquetas.';
  if (!title || title.length > 160 || subtitle.length > 300 || !author || author.length > 100 || !slug || slug.length > 180 || coverAlt.length > 250) return 'Revisa el titular, el subtítulo, la URL y la firma.';
  if (cover && !webUrl(cover)) return 'La URL de portada no es válida.';
  const raw = field(form, 'body');
  if (raw.length > 350000) return 'El contenido supera el tamaño permitido.';
  let body;
  try {
    body = JSON.parse(raw);
    if (body?.type !== 'doc' || !Array.isArray(body.content)) throw new Error();
  } catch {
    return 'El contenido del editor no es válido.';
  }
  const publish = field(form, 'intent') === 'publish';
  let publishedAt: string | null = null;
  let everPublished = false;
  if (id) {
    const { data, error } = await client.from('articles').select('published_at,ever_published').eq('id', id).single();
    if (error) return 'No se encontró la publicación.';
    publishedAt = data.published_at;
    everPublished = data.ever_published;
  }
  if (!category && (publish || publishedAt || everPublished)) return 'Selecciona una categoría. Solo los borradores pueden quedar sin categoría.';
  const row = { title, subtitle, author, slug, body, category_id: category || null, tag_ids: tagIds,
    cover_url: cover || null, cover_alt: coverAlt, featured: form.has('featured'),
    published_at: publish ? publishedAt ?? new Date().toISOString() : null };
  const { error } = id ? await client.from('articles').update(row).eq('id', id).select('id').single() : await client.from('articles').insert(row);
  if (error?.code === '23505') return 'Ya existe una publicación con esa URL.';
  if (error) return 'No se pudo guardar la publicación.';
  revalidatePath('/', 'layout');
  redirect('/mesa-editorial-7k4n/publicaciones');
}

export async function deleteArticle(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  const id = field(form, 'id');
  if (!client || !uuid.test(id)) return 'No se pudo autorizar la eliminación.';
  const { error } = await client.from('articles').delete().eq('id', id);
  if (error) return 'No se pudo eliminar la publicación.';
  revalidatePath('/', 'layout');
  redirect('/mesa-editorial-7k4n/publicaciones');
}

export async function manageTerm(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  const table = field(form, 'table');
  const id = field(form, 'id');
  if (!client || (table !== 'categories' && table !== 'tags') || (id && !uuid.test(id))) return 'Operación no autorizada.';
  const name = table === 'categories' ? field(form, 'name').toLocaleUpperCase('es') : field(form, 'name');
  const slug = slugify(name);
  const remove = field(form, 'intent') === 'delete';
  if (remove ? !id : !slug || name.length > 60) return 'Revisa los datos del formulario.';
  if (remove && table === 'categories') {
    const { count, error } = await client.from('articles').select('id', { count: 'exact', head: true }).eq('category_id', id);
    if (error || count === null) return 'No se pudo comprobar si la categoría tiene noticias.';
    if (count) return 'No se puede eliminar: esta categoría tiene noticias asociadas.';
    const { data, error: categoryError } = await client.from('categories').select('slug').eq('id', id).single();
    if (categoryError || !data) return 'No se pudo comprobar la categoría.';
    if (demoCategoryCount(data.slug)) return 'No se puede eliminar: esta categoría tiene noticias de muestra asociadas.';
  }
  const { error } = remove ? await client.from(table).delete().eq('id', id)
    : id ? await client.from(table).update(table === 'categories' ? { name } : { name, slug }).eq('id', id)
    : await client.from(table).insert({ name, slug });
  if (error?.code === '23505') return 'Ya existe un término con ese nombre.';
  if (error) return 'No se pudo guardar el cambio.';
  revalidatePath('/', 'layout');
  return 'Cambio guardado.';
}

export async function changePublicationStatus(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  const id = field(form, 'id');
  const intent = field(form, 'intent');
  if (!client || !uuid.test(id) || !['publish', 'unpublish'].includes(intent)) return 'No se pudo autorizar el cambio.';
  if (intent === 'publish') {
    const { data, error } = await client.from('articles').select('published_at,ever_published,category_id').eq('id', id).single();
    if (error || !data) return 'No se encontró la noticia.';
    if (!data.ever_published && !data.published_at) return 'Los borradores deben editarse antes de publicarlos.';
    if (!data.category_id) return 'Selecciona una categoría antes de publicar la noticia.';
  }
  const row = intent === 'publish'
    ? { published_at: new Date().toISOString(), ever_published: true }
    : { published_at: null };
  const { error } = await client.from('articles').update(row).eq('id', id).select('id').single();
  if (error) return 'No se pudo cambiar el estado de la noticia.';
  revalidatePath('/', 'layout');
  return 'Estado actualizado.';
}

export async function changeNewsCategory(_: string, form: FormData): Promise<string> {
  const client = await adminClient();
  const id = field(form, 'id');
  const category = field(form, 'category');
  if (!client || !uuid.test(id) || category && !uuid.test(category)) return 'No se pudo autorizar el cambio.';
  const { data: article, error } = await client.from('articles').select('published_at,ever_published').eq('id', id).single();
  if (error || !article) return 'No se encontró la noticia.';
  if (!category && (article.published_at || article.ever_published)) return 'Solo los borradores pueden quedar sin categoría.';
  if (category) {
    const { data, error } = await client.from('categories').select('id').eq('id', category).maybeSingle();
    if (error || !data) return 'Selecciona una categoría existente.';
  }
  let request = client.from('articles').update({ category_id: category || null }).eq('id', id);
  if (!category) request = request.is('published_at', null).eq('ever_published', false);
  const result = await request.select('id').single();
  if (result.error) return 'No se pudo cambiar la categoría. Actualiza la tabla e inténtalo de nuevo.';
  revalidatePath('/', 'layout');
  return 'Categoría actualizada.';
}
