import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/format';
import { configured } from '@/lib/supabase';
export default function robots(): MetadataRoute.Robots {
  return configured ? { rules: { userAgent: '*', allow: '/', disallow: '/buscar' }, sitemap: new URL('/sitemap.xml', siteUrl).href }
    : { rules: { userAgent: '*', disallow: '/' } };
}
