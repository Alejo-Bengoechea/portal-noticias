import Link from 'next/link';
import { EditionDate } from '@/components/edition-date';
import { PageView } from '@/components/page-view';
import { configured } from '@/lib/supabase';
import { getTerms } from '@/lib/articles';

export const metadata = configured ? {} : { robots: { index: false, follow: false } };

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Una categoría la resuelve cada página con su propio getTerms(); si falla aquí, el menú
  // se queda solo con Inicio en vez de tumbar también las páginas legales estáticas.
  const categories = await getTerms('categories').catch(() => []);
  return <div className="public-portal">
    {configured && <PageView />}
    <div className="edition-status">
      <span className="eyebrow archive-label">Archivos desclasificados</span>
      <EditionDate />
    </div>
    <svg className="rec-badge" aria-hidden="true" width="112" height="52" viewBox="0 0 112 52">
      <path d="M21 5H5v14m86-14h16v14M5 33v14h16m86-14v14H91" fill="none" stroke="#f4eddf" strokeWidth="2" strokeLinecap="square" />
      <circle cx="29" cy="26" r="8" fill="#ff304d" />
      <text x="45" y="34" fill="#f4eddf" fontSize="23" letterSpacing="1">REC</text>
    </svg>
    <header className="shell public-header">
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
          {categories.map(category => <Link key={category.id} href={`/categoria/${category.slug}`}>{category.name}</Link>)}
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
