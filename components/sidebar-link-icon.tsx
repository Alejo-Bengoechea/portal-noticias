'use client';

import { useLinkStatus } from 'next/link';

// Marca el enlace pulsado mientras llega la vista, para que el clic tenga respuesta inmediata.
export function SidebarLinkIcon({ icon }: { icon: string }) {
  const { pending } = useLinkStatus();
  return <span className={`sidebar-link-icon${pending ? ' is-pending' : ''}`} aria-hidden="true">{icon}</span>;
}
