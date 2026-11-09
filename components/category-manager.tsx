import { TermForm } from './admin-forms';
import type { Term } from '@/lib/articles';
import { CategoryCard } from './category-card';

export function CategoryManager({ categories }: { categories: (Term & { articleCount: number; demoArticleCount?: number })[] }) {
  return <section className="category-manager">
    <header className="composer-toolbar">
      <div><p className="eyebrow accent">Organización editorial</p><h1>Gestionar categorías</h1></div>
    </header>
    <section className="category-create" aria-labelledby="new-category-title">
      <div><h2 id="new-category-title">Nueva categoría</h2><p>Organiza las noticias por grandes temas.</p></div>
      <TermForm table="categories" />
    </section>
    <h2 className="category-list-heading">Categorías <span>{categories?.length ?? 0}</span></h2>
    <div className="category-grid">{categories?.map(category => <CategoryCard key={category.id} category={category} />)}</div>
    {!categories?.length && <p className="empty">Todavía no hay categorías. Crea la primera arriba.</p>}
  </section>;
}

