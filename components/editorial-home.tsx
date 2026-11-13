'use client';

import Link from 'next/link';
import type { EditorialHomeData } from '@/lib/editorial-home';
import { webUrl } from '@/lib/format';

const base = '/mesa-editorial-7k4n';
const timestamp = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const date = (value: string | null) => timestamp(value) ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(value!)) : 'Fecha sin registrar';
const count = (value: number | null) => value === null ? '—' : value.toLocaleString('es-ES');
function FileIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h4" /></svg>; }

export function EditorialHome({ data }: { data: EditorialHomeData }) {
  const drafts = data.drafts.map(draft => ({ ...draft, key: `saved-${draft.id}`, href: `${base}/articulos/${draft.id}` }))
    .sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt) || a.key.localeCompare(b.key)).slice(0, 6);
  const cover = data.cover;
  const coverUrl = webUrl(cover?.coverUrl);
  return <section className="editorial-home">
    <header className="home-heading"><h1 className="sr-only">Mesa de trabajo</h1><div><span className="home-kicker">INICIO / ESPACIO DE TRABAJO</span><p>Retoma una historia o empieza la siguiente.</p></div><Link className="home-new-story" href={`${base}/articulos/nuevo`}><span aria-hidden="true">＋</span>Nueva noticia<span aria-hidden="true">↗</span></Link></header>
    <div className="home-summary" aria-label="Resumen editorial">
      <Link href={`${base}/publicaciones?datos=reales&estado=publicado`} className="home-stat"><span><i data-state="published" />Publicadas</span><strong>{count(data.counts.published)}</strong><small>Noticias con publicación activa <span aria-hidden="true">↗</span></small></Link>
      <Link href={`${base}/publicaciones?datos=reales&estado=despublicado`} className="home-stat"><span><i data-state="unpublished" />Despublicadas</span><strong>{count(data.counts.unpublished)}</strong><small>Noticias retiradas del portal <span aria-hidden="true">↗</span></small></Link>
      <a href="#continuar-escribiendo" className="home-stat"><span><i data-state="draft" />Borradores</span><strong>{count(data.counts.drafts)}</strong><small>Guardados en Supabase <span aria-hidden="true">↓</span></small></a>
    </div>
    {data.errors.counts && <p className="home-data-warning" role="status">No se pudo completar el resumen de publicaciones. Los valores no disponibles aparecen con un guion.</p>}
    <div className="home-workspace-grid">
      <section className="home-drafts-panel" id="continuar-escribiendo" aria-labelledby="home-drafts-heading">
        <header className="home-panel-head"><div><span className="home-kicker">EN PROCESO</span><h2 id="home-drafts-heading">Continúa donde lo dejaste</h2><p>Tus borradores más recientes, listos para retomar.</p></div><span className="home-panel-glyph" aria-hidden="true">⌘</span></header>
        {data.errors.drafts && <p className="home-data-warning" role="status">No se pudieron cargar los borradores de Supabase.</p>}
        {drafts.length ? <ul className="home-draft-list">{drafts.map(draft => <li key={draft.key}><Link href={draft.href}><span className="home-draft-icon"><FileIcon /></span><span className="home-draft-content"><strong>{draft.title}</strong><span><span>{draft.category}</span></span><time dateTime={timestamp(draft.updatedAt) ? draft.updatedAt! : undefined}>{date(draft.updatedAt)}</time></span><span className="home-resume-arrow" aria-hidden="true">↗</span><span className="sr-only">Continuar editando</span></Link></li>)}</ul> : !data.errors.drafts ? <div className="home-empty"><span className="home-empty-icon"><FileIcon /></span><h3>La próxima historia empieza aquí.</h3><p>Cuando guardes un borrador, podrás retomarlo desde este espacio.</p><Link href={`${base}/articulos/nuevo`}>Empezar una noticia <span aria-hidden="true">→</span></Link></div> : null}
        <footer className="home-drafts-footer"><Link href={`${base}/borradores?datos=reales`}>Borradores en Supabase ↗</Link></footer>
      </section>
      <section className="home-cover-panel" aria-labelledby="home-cover-heading">
        <header className="home-panel-head"><div><span className="home-kicker">EN EL PORTAL</span><h2 id="home-cover-heading">Portada actual</h2></div><Link href="/" aria-label="Ver inicio del portal">↗</Link></header>
        {data.errors.cover ? <p className="home-data-warning" role="status">No se pudo consultar la portada actual. Inténtalo de nuevo más tarde.</p> : cover ? <>
          <Link href={`/noticia/${cover.slug}`} className="home-cover-image" aria-label={`Leer ${cover.title}`}>{coverUrl ? <img src={coverUrl} alt={cover.coverAlt} loading="lazy" /> : <span className="home-cover-placeholder" aria-hidden="true">AB<span>.</span></span>}<span className="home-cover-label">{cover.featured ? 'DESTACADA' : 'ÚLTIMA PUBLICADA'}</span></Link>
          <div className="home-cover-copy"><span className="home-cover-category">{cover.category}</span><h3><Link href={`/noticia/${cover.slug}`}>{cover.title}</Link></h3>{cover.subtitle && <p>{cover.subtitle}</p>}<time dateTime={cover.publishedAt}>{date(cover.publishedAt)}</time></div>
          <footer className="home-cover-footer"><Link href={`/noticia/${cover.slug}`}>Abrir noticia ↗</Link><Link href={`${base}/articulos/${cover.id}`}>Editar noticia</Link></footer>
        </> : <div className="home-empty home-cover-empty"><span className="home-empty-icon" aria-hidden="true">▧</span><h3>Tu portada está por escribir.</h3><p>La noticia destacada aparecerá aquí cuando esté publicada.</p><Link href={`${base}/publicaciones?datos=reales`}>Ver noticias guardadas →</Link></div>}
      </section>
    </div>
    <p className="home-data-note">Resumen de tus noticias guardadas en Supabase.</p>
  </section>;
}
