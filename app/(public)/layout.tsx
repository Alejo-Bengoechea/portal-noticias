import Link from 'next/link';
import { EditionDate } from '@/components/edition-date';
import { PageView } from '@/components/page-view';
import { configured } from '@/lib/supabase';
import { getTerms } from '@/lib/articles';
import { PublicNavLink } from '@/components/public-nav-link';
import { ThemeSwitcher } from '@/components/theme-switcher';

export const metadata = configured ? {} : { robots: { index: false, follow: false } };

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Una categoría la resuelve cada página con su propio getTerms(); si falla aquí, el menú
  // se queda solo con Inicio en vez de tumbar también las páginas legales estáticas.
  const categories = await getTerms('categories').catch(() => []);
  return <div className="public-portal">
    {configured && <PageView />}
    <ThemeSwitcher />
    <div className="portal-edition"><span>Archivos desclasificados</span><EditionDate /></div>
    <header className="shell public-header">
      <div className="masthead"><img className="masthead-illustration" src="/ilustracion-periodismo-transparente.png" alt="" draggable={false} /><div className="masthead-logo"><span className="masthead-name">ALEJO BENGOECHEA<span className="brand-dot">.</span></span><span className="masthead-tagline">Periodismo independiente</span></div></div>
      <nav className="nav" aria-label="Secciones"><div className="section-links"><PublicNavLink href="/">Inicio</PublicNavLink>{categories.map(category => <PublicNavLink key={category.id} href={`/categoria/${category.slug}`}>{category.name}</PublicNavLink>)}</div><form autoComplete="off" className="index-search" action="/buscar" role="search" aria-label="Buscador del portal"><span className="search-icon" aria-hidden="true" /><input type="search" name="q" placeholder="Buscar" aria-label="Buscar noticias" autoComplete="off" maxLength={100} /></form></nav>
    </header>
    <main className="shell main" id="contenido">
      {children}
    </main>
    <footer className="shell footer"><div><Link href="/" className="footer-brand">ALEJO BENGOECHEA<span className="brand-dot">.</span></Link><p>Periodismo independiente.</p></div><nav className="footer-links" aria-label="Información legal"><Link href="/derechos">Derechos</Link><Link href="/privacidad">Privacidad</Link></nav><p className="footer-copy">© {new Date().getFullYear()} Alejo Bengoechea</p></footer>
  </div>;
}
