'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function EditorialSidebar({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefetch = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const href = target.closest('a')?.getAttribute('href');
    if (href?.startsWith('/mesa-editorial-7k4n')) router.prefetch(href);
  };
  const sidebar = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    sidebar.current?.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      const active = href === pathname || (href === '/mesa-editorial-7k4n/articulos/nuevo' && pathname.startsWith('/mesa-editorial-7k4n/articulos/'));
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }, [pathname]);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 1023px)');
    const update = () => {
      if (sidebar.current) sidebar.current.open = !mobile.matches;
    };
    update();
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, []);

  return <details ref={sidebar} className="console-sidebar" open
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
        if (sidebar.current) sidebar.current.open = false;
      }
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && sidebar.current) {
        sidebar.current.open = false;
        sidebar.current.querySelector('summary')?.focus();
      }
    }}>
    {children}
  </details>;
}
