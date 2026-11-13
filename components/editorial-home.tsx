'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { EditorialHomeData } from '@/lib/editorial-home';
import { webUrl } from '@/lib/format';

const base = '/mesa-editorial-7k4n';
const newStory = `${base}/articulos/nuevo`;
const draftsManager = `${base}/borradores`;
const publishedManager = `${base}/publicaciones?estado=publicado`;
const unpublishedManager = `${base}/publicaciones?estado=despublicado`;
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const validDate = (value: string | null): value is string => value !== null && Number.isFinite(Date.parse(value));
const date = (value: string | null) => validDate(value) ? dateFormat.format(new Date(value)) : 'Fecha sin registrar';
const count = (value: number | null) => value === null ? '—' : value.toLocaleString('es-ES');
function FileIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h4" /></svg>; }

export function EditorialHome({ data }: { data: EditorialHomeData }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const { drafts, cover, errors } = data;
  const hasError = errors.counts || errors.drafts || errors.cover;
  const coverUrl = webUrl(cover?.coverUrl);
  return <section className="editorial-home">
    <header className="home-heading">
      <h1 className="sr-only">Mesa de trabajo</h1>
      <div><span className="home-kicker">INICIO / ESPACIO DE TRABAJO</span><p>Retoma una historia o empieza la siguiente.</p></div>
      <Link className="home-new-story" href={newStory}><span aria-hidden="true">＋</span>Nueva noticia<span aria-hidden="true">↗</span></Link>
    </header>
    <div className="home-summary" aria-label="Resumen editorial">
      <Link href={publishedManager} className="home-stat"><span><i data-state="published" />Publicadas</span><strong>{count(data.counts.published)}</strong><small>Ver publicadas <span aria-hidden="true">↗</span></small></Link>
      <Link href={unpublishedManager} className="home-stat"><span><i data-state="unpublished" />Despublicadas</span><strong>{count(data.counts.unpublished)}</strong><small>Ver despublicadas <span aria-hidden="true">↗</span></small></Link>
      <Link href={draftsManager} className="home-stat"><span><i data-state="draft" />Borradores</span><strong>{count(data.counts.drafts)}</strong><small>Ver borradores <span aria-hidden="true">↗</span></small></Link>
    </div>
    {hasError && <div className="home-data-warning home-retry">
      <p role="status">{errors.counts ? 'Hay recuentos que no se pudieron cargar.' : 'Hay secciones que no se pudieron cargar.'}</p>
      <button type="button" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? 'Cargando…' : 'Reintentar'}</button>
    </div>}
    <div className="home-workspace-grid">
      <div className="home-workspace-stack">
        <section className="home-drafts-panel" id="continuar-escribiendo" aria-labelledby="home-drafts-heading">
          <header className="home-panel-head home-panel-head-compact">
            <h2 id="home-drafts-heading">Continúa donde lo dejaste</h2>
            <Link className="home-panel-link" href={draftsManager}>Ver todos los borradores <span aria-hidden="true">↗</span></Link>
          </header>
          {errors.drafts ? <p className="home-data-warning" role="status">No se pudieron cargar los borradores de Supabase.</p>
            : drafts.length ? <ul className="home-draft-list">{drafts.map(draft => <li key={draft.id}>
              <Link href={`${base}/articulos/${draft.id}`}>
                <span className="home-draft-icon"><FileIcon /></span>
                <span className="home-draft-content">
                  <strong>{draft.title}</strong>
                  <span className="home-draft-meta">
                    <span>{draft.category}</span>
                    <time dateTime={validDate(draft.updatedAt) ? draft.updatedAt : undefined}>{date(draft.updatedAt)}</time>
                  </span>
                </span>
                <span className="home-resume-arrow" aria-hidden="true">↗</span><span className="sr-only">Continuar editando</span>
              </Link>
            </li>)}</ul>
            : <div className="home-empty home-drafts-empty"><h3>Aún no hay borradores</h3><Link href={newStory}>Empezar una noticia <span aria-hidden="true">→</span></Link></div>}
        </section>
        <section className="home-daily-panel" aria-labelledby="home-daily-heading">
          <header className="home-panel-head home-panel-head-compact">
            <h2 id="home-daily-heading">Novedades del día</h2>
          </header>
          <table className="home-daily-table" aria-labelledby="home-daily-heading">
            <thead><tr><th scope="col">Tipo</th><th scope="col">Detalle</th><th scope="col">Hora</th></tr></thead>
            <tbody>
              <tr><td colSpan={3}>
                <div className="home-empty home-daily-empty">
                  <span className="home-empty-icon">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 14h5l2 3h4l2-3h5M3 14l3-8h12l3 8v5H3z" />
                    </svg>
                  </span>
                  <h3>Por ahora, sin novedades</h3>
                  <p>Aquí aparecerán ideas, sugerencias, propuestas de mejora, avisos y alertas para tu jornada editorial.</p>
                </div>
              </td></tr>
            </tbody>
          </table>
        </section>
      </div>
      <section className="home-cover-panel" aria-labelledby="home-cover-heading">
        <header className="home-panel-head"><div><span className="home-kicker">EN EL PORTAL</span><h2 id="home-cover-heading">Portada actual</h2></div><Link href="/" aria-label="Ver inicio del portal">↗</Link></header>
        {errors.cover ? <p className="home-data-warning" role="status">No se pudo consultar la portada actual.</p> : cover ? <>
          <Link href={`/noticia/${cover.slug}`} className="home-cover-image" aria-label={`Leer ${cover.title}`}>{coverUrl ? <img src={coverUrl} alt={cover.coverAlt} loading="lazy" /> : <span className="home-cover-placeholder" aria-hidden="true">AB<span>.</span></span>}<span className="home-cover-label">{cover.featured ? 'DESTACADA' : 'ÚLTIMA PUBLICADA'}</span></Link>
          <div className="home-cover-copy"><span className="home-cover-category">{cover.category}</span><h3><Link href={`/noticia/${cover.slug}`}>{cover.title}</Link></h3>{cover.subtitle && <p>{cover.subtitle}</p>}<time dateTime={cover.publishedAt}>{date(cover.publishedAt)}</time></div>
          <footer className="home-cover-footer"><Link href={`/noticia/${cover.slug}`}>Abrir noticia ↗</Link><Link href={`${publishedManager}&q=${encodeURIComponent(cover.id)}`}>Gestionar publicación</Link></footer>
        </> : <div className="home-empty home-cover-empty"><span className="home-empty-icon" aria-hidden="true">▧</span><h3>La portada todavía está vacía.</h3><p>Publica una noticia desde el gestor para que aparezca en el portal.</p><Link href={unpublishedManager}>Ver despublicadas →</Link></div>}
      </section>
    </div>
  </section>;
}
