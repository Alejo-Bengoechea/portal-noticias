'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function EditorialSidebar({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefetch = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const href = target.closest('a')?.getAttribute('href');
    if (href?.startsWith('/mesa-editorial-7k4n')) router.prefetch(href);
  };
  const sidebar = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [collapsed, setCollapsed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    sidebar.current?.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      const active = href === pathname || Boolean(href && href !== '/mesa-editorial-7k4n' && pathname.startsWith(href + '/')) || (href === '/mesa-editorial-7k4n/articulos/nuevo' && pathname.startsWith('/mesa-editorial-7k4n/articulos/'));
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }, [pathname]);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 1023px)');
    const update = () => setCollapsed(mobile.matches);
    update();
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, []);

  const isCollapsed = () => collapsed ?? window.matchMedia('(max-width: 1023px)').matches;

  return <aside ref={sidebar} className="console-sidebar" data-collapsed={collapsed ?? 'auto'}
    onClickCapture={event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest('a');
      const href = link?.getAttribute('href');
      if (href === '/mesa-editorial-7k4n/articulos/nuevo' && window.location.pathname === href) {
        event.preventDefault();
        window.location.assign(href);
      }
    }}
    onPointerOver={event => prefetch(event.target)}
    onFocus={event => prefetch(event.target)}
    onClick={event => {
      if (event.target instanceof Element && event.target.closest('a') && window.matchMedia('(max-width: 1023px)').matches) {
        setCollapsed(true);
      }
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && !event.defaultPrevented && !isCollapsed()) {
        setCollapsed(true);
        toggle.current?.focus();
      }
    }}>
    <button type="button" ref={toggle} className="console-sidebar-toggle" aria-expanded={collapsed === undefined ? undefined : !collapsed}
      aria-label={collapsed === undefined ? 'Alternar barra lateral' : collapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
      title={collapsed ? 'Mostrar barra lateral' : undefined}
      onClick={() => setCollapsed(!isCollapsed())}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M9 5v14" />
      </svg>
      <span className="sidebar-title">Ocultar barra lateral</span>
    </button>
    {children}
  </aside>;
}
