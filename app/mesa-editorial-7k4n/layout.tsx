import { ResetEditorialData } from '@/components/reset-editorial-data';
import Link from 'next/link';
import { adminClient } from '@/lib/supabase';
import { logout } from './actions';
import { EditorialSidebar } from '@/components/editorial-sidebar';
export const metadata = { title: 'Administración', robots: { index: false, follow: false } };

function SidebarLink({ href, icon, label, prefetch }: { href: string; icon: string; label: string; prefetch?: boolean }) {
  return <Link href={href} prefetch={prefetch} aria-label={label} title={label}>
    <span className="sidebar-link-icon" aria-hidden="true">{icon}</span>
    <span className="sidebar-link-label">{label}</span>
  </Link>;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authorized = Boolean(await adminClient());
  return <div className={`editorial-console${authorized ? ' with-sidebar' : ''}`}>
    {authorized && <EditorialSidebar>
      <div className="console-sidebar-body">
        <nav aria-label="Menú editorial">
          <div className="console-workspace"><span className="console-workspace-icon" aria-hidden="true">⌘</span><div><strong>Mesa editorial</strong><span>ÁREA EDITORIAL · PRIVADO</span></div><i aria-hidden="true" /></div>
          <p>Portal</p>
          <SidebarLink href="/mesa-editorial-7k4n" icon="⌂" label="Inicio editorial" />
          <p>Creación editorial</p>
          <SidebarLink href="/mesa-editorial-7k4n/articulos/nuevo" icon="＋" label="Nueva noticia" />
          <SidebarLink href="/mesa-editorial-7k4n/categorias/nueva" icon="◇" label="Nueva categoría" />
          <p>Gestión editorial</p>
          <SidebarLink prefetch href="/mesa-editorial-7k4n/publicaciones" icon="▤" label="Gestor de noticias" />
          <SidebarLink prefetch href="/mesa-editorial-7k4n/borradores" icon="▱" label="Gestor de borradores" />
          <SidebarLink href="/mesa-editorial-7k4n/estadisticas" icon="▥" label="Audiencia y tráfico" />
          <p>Mesa de trabajo</p>
          <SidebarLink href="/mesa-editorial-7k4n/organizacion" icon="▦" label="Organización" />
          <SidebarLink href="/mesa-editorial-7k4n/fuentes" icon="◉" label="Fuentes" />
          <SidebarLink href="/mesa-editorial-7k4n/redes-sociales" icon="◎" label="Redes Sociales" />
          <p>Supabase</p>
          <SidebarLink href="/mesa-editorial-7k4n/multimedia" icon="▧" label="Multimedia" />
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
