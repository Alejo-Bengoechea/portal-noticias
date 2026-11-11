import { ResetEditorialData } from '@/components/reset-editorial-data';
import Link from 'next/link';
import { adminClient } from '@/lib/supabase';
import { logout } from './actions';
import { EditorialSidebar } from '@/components/editorial-sidebar';
export const metadata = { title: 'Administración', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authorized = Boolean(await adminClient());
  return <div className={`editorial-console${authorized ? ' with-sidebar' : ''}`}>
    {authorized && <EditorialSidebar>
      <summary aria-label="Alternar barra lateral">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M9 5v14" />
        </svg>
        <span className="sidebar-title">Ocultar barra lateral</span>
        <span className="sr-only">Alternar menú lateral</span>
      </summary>
      <div className="console-sidebar-body">
        <nav aria-label="Menú editorial">
          <div className="console-workspace"><span className="console-workspace-icon" aria-hidden="true">⌘</span><div><strong>Mesa editorial</strong><span>ÁREA EDITORIAL · PRIVADO</span></div><i aria-hidden="true" /></div>
          <p>Portal</p>
          <Link href="/mesa-editorial-7k4n"><span aria-hidden="true">⌂</span>Inicio editorial</Link>
          <p>Creación editorial</p>
          <Link href="/mesa-editorial-7k4n/articulos/nuevo"><span aria-hidden="true">＋</span>Nueva noticia</Link>
          <Link href="/mesa-editorial-7k4n/categorias/nueva"><span aria-hidden="true">◇</span>Nueva categoría</Link>
          <p>Gestión editorial</p>
          <Link prefetch={true} href="/mesa-editorial-7k4n/publicaciones"><span aria-hidden="true">▤</span>Gestor de noticias</Link>
          <Link prefetch={true} href="/mesa-editorial-7k4n/borradores"><span aria-hidden="true">▱</span>Gestor de borradores</Link>
          <Link href="/mesa-editorial-7k4n/estadisticas"><span aria-hidden="true">▥</span>Audiencia y tráfico</Link>
          <p>Mesa de trabajo</p>
          <Link href="/mesa-editorial-7k4n/organizacion"><span aria-hidden="true">▦</span>Organización</Link>
          <Link href="/mesa-editorial-7k4n/fuentes"><span aria-hidden="true">◉</span>Fuentes</Link>
          <p>Supabase</p>
          <Link href="/mesa-editorial-7k4n/multimedia"><span aria-hidden="true">▧</span>Multimedia</Link>
        </nav>
        <div className="console-sidebar-footer">
          <ResetEditorialData />
          <Link className="console-portal console-footer-action" href="/"><span aria-hidden="true">↗</span>Ir al portal</Link>
          <form autoComplete="off" className="console-logout" action={logout}><button className="console-footer-action"><span aria-hidden="true">⇥</span>Cerrar sesión</button></form>
          <div className="console-brand">Alejo <strong>Bengoechea</strong></div>
        </div>
      </div>
    </EditorialSidebar>}
    <main id="contenido" className="shell admin">
      {children}
    </main>
  </div>;
}
