'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function PageView() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    void fetch(`/api/traffic?path=${encodeURIComponent(pathname)}`, {
      method: 'POST', credentials: 'omit', keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
