'use client';

import { useEffect, useRef, useState } from 'react';
import { TermForm } from './admin-forms';
import type { Term } from '@/lib/articles';
import { CategoryCard } from './category-card';

export function CategoryManager({ categories }: { categories: (Term & { articleCount: number })[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const all = categories.length > 0 && categories.every(category => selected.has(category.id));
  const checkbox = useRef<HTMLInputElement>(null);
  useEffect(() => { if (checkbox.current) checkbox.current.indeterminate = !all && categories.some(category => selected.has(category.id)); }, [all, categories, selected]);
  return <section className="category-manager">
    <header className="composer-toolbar">
      <div><p className="eyebrow accent">Organización editorial</p><h1>Gestionar categorías</h1></div>
    </header>
    <section className="category-create" aria-labelledby="new-category-title">
      <div><h2 id="new-category-title">Nueva categoría</h2><p>Organiza las noticias por grandes temas.</p></div>
      <TermForm table="categories" />
    </section>
    <h2 className="category-list-heading">Categorías <span>{categories?.length ?? 0}</span></h2>
    {!!categories?.length && <div className="manager-table-scroll category-table-scroll" role="region" aria-label="Categorías" tabIndex={0}>
      <table className="manager-table category-table"><caption className="sr-only">Categorías guardadas</caption>
        <colgroup><col style={{ width: 44 }} /><col /><col style={{ width: '18%' }} /><col style={{ width: '32%' }} /></colgroup>
        <thead><tr><th scope="col"><input ref={checkbox} autoComplete="off" type="checkbox" aria-label="Seleccionar todas las categorías" checked={all} onChange={() => setSelected(all ? new Set() : new Set(categories.map(category => category.id)))} /></th><th scope="col">Nombre</th><th scope="col">Noticias</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{categories.map(category => <CategoryCard key={category.id} category={category} selected={selected.has(category.id)} onSelect={() => setSelected(previous => { const next = new Set(previous); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next; })} />)}</tbody>
      </table></div>}
    {!categories?.length && <p className="empty editorial-empty">Todavía no hay categorías. Crea la primera arriba.</p>}
  </section>;
}

