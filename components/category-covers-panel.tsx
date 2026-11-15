'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { setCategoryCovers, setHomeCovers } from '@/app/mesa-editorial-7k4n/actions';
import { webUrl } from '@/lib/format';
import type { CategoryCoverData, CoverOption } from '@/lib/category-covers';

const openKey = 'editorial.categoryCovers.open';
const slots = [0, 1, 2];

function initialCovers(articles: CoverOption[]) {
  const covers: Record<string, string[]> = {};
  for (const article of [...articles].filter(article => article.position).sort((a, b) => a.position! - b.position!)) {
    (covers[article.category_id] ??= []).push(article.id);
  }
  return covers;
}

export function CategoryCoversPanel({ data }: { data: CategoryCoverData }) {
  const [covers, setCovers] = useState(() => initialCovers(data.articles));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');
  const [homeIds, setHomeIds] = useState(data.homeIds);
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();
  const byId = useMemo(() => new Map(data.articles.map(article => [article.id, article])), [data.articles]);

  useEffect(() => {
    try { if (localStorage.getItem(openKey) === '0') setOpen(false); } catch {}
  }, []);
  useEffect(() => setCovers(initialCovers(data.articles)), [data.articles]);
  useEffect(() => setHomeIds(data.homeIds), [data.homeIds]);

  function toggle(next: boolean) {
    setOpen(next);
    try { localStorage.setItem(openKey, next ? '1' : '0'); } catch {}
  }

  function save(category: string, next: string[]) {
    const previous = covers[category] ?? [];
    setCovers(current => ({ ...current, [category]: next }));
    setErrors(current => ({ ...current, [category]: '' }));
    setSaving(category);
    startTransition(async () => {
      const message = await setCategoryCovers(category, next).catch(() => 'No se pudieron guardar las portadas. Inténtalo de nuevo.');
      if (message) {
        setCovers(current => ({ ...current, [category]: previous }));
        setErrors(current => ({ ...current, [category]: message }));
      }
      setSaving('');
    });
  }

  function saveHome(next: string[]) {
    const previous = homeIds;
    setHomeIds(next);
    setErrors(current => ({ ...current, home: '' }));
    setSaving('home');
    startTransition(async () => {
      const message = await setHomeCovers(next).catch(() => 'No se pudieron guardar las portadas. Inténtalo de nuevo.');
      if (message) { setHomeIds(previous); setErrors(current => ({ ...current, home: message })); }
      setSaving('');
    });
  }

  const homeChosen = homeIds.filter(id => byId.has(id));
  const homeBusy = saving === 'home';
  const total = Object.values(covers).reduce((sum, list) => sum + list.length, 0) + homeChosen.length;

  return <details className="category-covers" open={open} onToggle={event => toggle(event.currentTarget.open)}>
    <summary>
      <span className="category-covers-title">Portadas por categoría</span>
      <span className="category-covers-count">{total ? `${total} elegida${total === 1 ? '' : 's'}` : 'Sin elegir'}</span>
    </summary>
    <p className="category-covers-hint">Elige hasta tres noticias publicadas para el inicio y para cada categoría. Con más de una, la portada las alterna cada 5 segundos. En el inicio se ordenan de más reciente a más antigua. Si no eliges ninguna, se muestra la más reciente.</p>
    {data.missing ? <p className="category-covers-notice">Aplica la migración <code>202611150001_category_covers.sql</code> en Supabase para elegir portadas por categoría.</p>
      : data.error ? <p className="category-covers-notice" role="alert">No se pudieron cargar las noticias publicadas. Recarga la página.</p>
      : !data.categories.length ? <p className="category-covers-notice">Crea una categoría para elegir sus portadas.</p>
      : <div className="category-covers-list">
        <section className="category-cover-row home" aria-labelledby="cover-home" aria-busy={homeBusy}>
          <header><h2 id="cover-home">INICIO</h2><span>{homeBusy ? 'Guardando…' : `${homeChosen.length}/3`}</span></header>
          <ol className="category-cover-slots">
            {slots.map(slot => {
              const article = byId.get(homeChosen[slot]);
              if (article) {
                const src = webUrl(article.cover_url);
                return <li className="category-cover-slot filled" key={article.id}>
                  <span className="category-cover-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">AB.</span>}<b>{slot + 1}</b></span>
                  <span className="category-cover-name" title={article.title}>{article.title}</span>
                  <span className="category-cover-actions">
                    <button type="button" className="remove" disabled={homeBusy} aria-label={`Quitar «${article.title}» de las portadas de inicio`} onClick={() => saveHome(homeChosen.filter(id => id !== article.id))}>×</button>
                  </span>
                </li>;
              }
              if (slot !== homeChosen.length) return <li className="category-cover-slot empty" key={`empty-${slot}`} aria-hidden="true"><b>{slot + 1}</b></li>;
              return <li className="category-cover-slot add" key="add">
                <select autoComplete="off" value="" disabled={homeBusy} aria-label="Añadir portada a inicio"
                  onChange={event => { if (event.target.value) saveHome([...homeChosen, event.target.value]); }}>
                  <option value="">＋ Añadir portada</option>
                  {data.articles.filter(article => !homeChosen.includes(article.id)).map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
                </select>
              </li>;
            })}
          </ol>
          {errors.home && <p className="category-cover-error" role="alert">{errors.home}</p>}
        </section>
        {data.categories.map(category => {
          const chosen = (covers[category.id] ?? []).filter(id => byId.has(id));
          const options = data.articles.filter(article => article.category_id === category.id && !chosen.includes(article.id));
          const busy = saving === category.id;
          const move = (index: number, step: number) => {
            const next = [...chosen];
            [next[index], next[index + step]] = [next[index + step], next[index]];
            save(category.id, next);
          };
          return <section className="category-cover-row" key={category.id} aria-labelledby={`cover-${category.id}`} aria-busy={busy}>
            <header>
              <h2 id={`cover-${category.id}`}>{category.name}</h2>
              <span>{busy ? 'Guardando…' : `${chosen.length}/3`}</span>
            </header>
            <ol className="category-cover-slots">
              {slots.map(slot => {
                const article = byId.get(chosen[slot]);
                if (article) {
                  const src = webUrl(article.cover_url);
                  return <li className="category-cover-slot filled" key={article.id}>
                    <span className="category-cover-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">AB.</span>}<b>{slot + 1}</b></span>
                    <span className="category-cover-name" title={article.title}>{article.title}</span>
                    <span className="category-cover-actions">
                      <button type="button" disabled={busy || slot === 0} aria-label={`Mover «${article.title}» antes`} onClick={() => move(slot, -1)}>←</button>
                      <button type="button" disabled={busy || slot === chosen.length - 1} aria-label={`Mover «${article.title}» después`} onClick={() => move(slot, 1)}>→</button>
                      <button type="button" className="remove" disabled={busy} aria-label={`Quitar «${article.title}» de las portadas de ${category.name}`} onClick={() => save(category.id, chosen.filter(id => id !== article.id))}>×</button>
                    </span>
                  </li>;
                }
                if (slot !== chosen.length) return <li className="category-cover-slot empty" key={`empty-${slot}`} aria-hidden="true"><b>{slot + 1}</b></li>;
                return <li className="category-cover-slot add" key="add">
                  {options.length ? <select autoComplete="off" value="" disabled={busy} aria-label={`Añadir portada a ${category.name}`}
                    onChange={event => { if (event.target.value) save(category.id, [...chosen, event.target.value]); }}>
                    <option value="">＋ Añadir portada</option>
                    {options.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
                  </select> : <span className="category-cover-none">{chosen.length ? 'No quedan más noticias publicadas' : 'Sin noticias publicadas'}</span>}
                </li>;
              })}
            </ol>
            {errors[category.id] && <p className="category-cover-error" role="alert">{errors[category.id]}</p>}
          </section>;
        })}
      </div>}
  </details>;
}
