import Link from 'next/link';
import { EditionDate } from '@/components/edition-date';
import { PageView } from '@/components/page-view';
import { configured } from '@/lib/supabase';

export const metadata = configured ? {} : { robots: { index: false, follow: false } };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-portal">
    {configured && <PageView />}
    <div className="edition-status">
      <span className="eyebrow archive-label">Archivos desclasificados</span>
      <EditionDate />
    </div>
    <header className="shell public-header">
      <img className="rec-badge" src="/rec.svg" alt="" width="112" height="52" />
      <div className="masthead">
        <Link href="/" className="masthead-logo">
          <span className="masthead-name">Alejo <strong>Bengoechea</strong></span>
          <span className="masthead-tagline">Periodismo y análisis</span>
        </Link>
      </div>
      <nav className="nav" aria-label="Secciones">
        <form autoComplete="off" className="index-search" action="/buscar" role="search" aria-label="Buscador del portal">
          <input type="search" name="q" placeholder="Buscar" aria-label="Buscar noticias" autoComplete="off" maxLength={100} />
          <button type="submit">Buscar</button>
        </form>
        <div className="section-links">
          <Link href="/">Inicio</Link>
          <Link href="/categoria/internacional">Internacional</Link>
          <Link href="/categoria/espana">España</Link>
          <Link href="/categoria/economia">Economía</Link>
        </div>
      </nav>
    </header>
    <main className="shell main" id="contenido">
      {children}
    </main>
    <footer className="shell footer">
      <p>Alejo Bengoechea | Todos los derechos reservados © 2026</p>
      <nav className="footer-links" aria-label="Información legal">
        <Link href="/derechos">Derechos</Link>
        <Link href="/privacidad">Privacidad</Link>
      </nav>
    </footer>
  </div>;
}
