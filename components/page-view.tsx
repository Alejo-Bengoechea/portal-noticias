'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function PageView() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    const params = new URLSearchParams({ path: pathname });
    // La primera página cargada es la entrada de la visita: se envía solo el dominio de procedencia.
    if (lastPath.current === null) {
      params.set('entry', '1');
      try {
        const referrer = document.referrer ? new URL(document.referrer).hostname : '';
        if (referrer) params.set('ref', referrer.slice(0, 253));
      } catch {}
    }
    lastPath.current = pathname;
    void fetch(`/api/traffic?${params}`, {
      method: 'POST', credentials: 'omit', keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
