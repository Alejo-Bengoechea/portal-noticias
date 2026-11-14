import type { Metadata } from 'next';
import { siteUrl } from '@/lib/format';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: 'Alejo Bengoechea | Periodismo y análisis', template: '%s | Alejo Bengoechea' },
  description: 'Actualidad, mundo y cultura. Un medio independiente para entender qué pasó y por qué importa.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.portalTheme=localStorage.getItem('portal-theme')==='claro'?'claro':'oscuro'}catch(e){document.documentElement.dataset.portalTheme='oscuro'}` }} /></head><body><a className="skip" href="#contenido">Saltar al contenido</a>{children}</body></html>;
}
