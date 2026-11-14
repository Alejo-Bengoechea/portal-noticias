'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PublicNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return <Link href={href} aria-current={pathname === href ? 'page' : undefined}>{children}</Link>;
}
