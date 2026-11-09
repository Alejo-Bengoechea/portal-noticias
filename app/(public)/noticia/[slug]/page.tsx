import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle, getTerms } from '@/lib/articles';
import { dateLabel, webUrl } from '@/lib/format';
import { Cover } from '@/components/cards';
import { RichText } from '@/components/rich-text';
import { EditorialArticleBody } from '@/components/news-preview';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const image = webUrl(article.cover_url);
  return { title: article.title, description: article.subtitle, alternates: { canonical: `/noticia/${slug}` },
    openGraph: { type: 'article' as const, title: article.title, description: article.subtitle, url: `/noticia/${slug}`,
      publishedTime: article.published_at ?? undefined, authors: [article.author], images: image ? [image] : undefined } };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, categories, tags] = await Promise.all([getArticle(slug), getTerms('categories'), getTerms('tags')]);
  if (!article) notFound();
  const category = categories.find(c => c.id === article.category_id);
  const editorial = article.body_format === 'editorial';
  const editorialTags = editorial && article.body && typeof article.body === 'object' && !Array.isArray(article.body)
    ? (article.body as { metadatos?: { etiquetas?: unknown } }).metadatos?.etiquetas : undefined;
  const displayedTags = editorial
    ? (Array.isArray(editorialTags) ? editorialTags.map(String) : [])
    : tags.filter(t => article.tag_ids.includes(t.id)).map(t => t.name);
  return <article className="story">
    {category && <Link className="eyebrow accent" href={`/categoria/${category.slug}`}>{category.name}</Link>}
    <h1>{article.title}</h1>
    <p className="dek">{article.subtitle}</p>
    <p className="byline">Por <strong>{article.author}</strong> {article.published_at && <time dateTime={article.published_at}>{dateLabel(article.published_at)}</time>}</p>
    <Cover article={article} priority />
    {editorial ? <EditorialArticleBody news={article.body as Record<string, unknown>} /> : <RichText body={article.body} />}
    <ul className="tags">{displayedTags.map(name => <li key={name}>{name}</li>)}</ul>
  </article>;
}
