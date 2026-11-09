import { redirect } from 'next/navigation';
import { adminClient, configured } from '@/lib/supabase';
import { LoginForm } from '@/components/admin-forms';
import { EditorialLogin } from '@/components/editorial-login';

export default async function Login() {
  if (await adminClient()) redirect('/mesa-editorial-7k4n');
  return <EditorialLogin>
    {configured && process.env.ADMIN_USER_ID ? <LoginForm /> : <p>El panel se habilitará al configurar Supabase y la cuenta de administrador. Consulta el README del proyecto.</p>}
  </EditorialLogin>;
}
