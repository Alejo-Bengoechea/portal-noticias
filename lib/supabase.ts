import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const publicClient = () => url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

export async function sessionClient() {
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // El proxy actualiza las cookies durante el renderizado.
        }
      },
    },
  });
}

// React cache only deduplicates within this server render/request, never across users.
export const adminClient = cache(async () => {
  const client = await sessionClient();
  if (!client || !process.env.ADMIN_USER_ID) return null;
  // getClaims verifica la firma del token (en local si el proyecto usa claves asimétricas).
  // Ambas comprobaciones se lanzan a la vez y las dos deben pasar.
  const [{ data }, { data: allowed }] = await Promise.all([client.auth.getClaims(), client.rpc('is_editorial_admin')]);
  if (data?.claims.sub !== process.env.ADMIN_USER_ID) return null;
  return allowed === true ? client : null;
});
