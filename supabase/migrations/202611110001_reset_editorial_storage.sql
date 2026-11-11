-- Permisos e inventario para la limpieza de pruebas. Ejecutar no borra archivos.
begin;

drop policy if exists list_editorial_admin on storage.objects;
create policy list_editorial_admin on storage.objects for select to authenticated
using (bucket_id = 'editorial' and public.is_editorial_admin());

drop policy if exists delete_editorial_admin on storage.objects;
create policy delete_editorial_admin on storage.objects for delete to authenticated
using (bucket_id = 'editorial' and public.is_editorial_admin());

-- Permite detectar un listado vacío o parcial por permisos antes de borrar.
create or replace function public.editorial_storage_count()
returns bigint language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce(public.is_editorial_admin(), false) then
    raise exception 'Operación no autorizada' using errcode = '42501';
  end if;
  return (select count(*) from storage.objects where bucket_id = 'editorial');
end;
$$;

revoke all on function public.editorial_storage_count() from public, anon;
grant execute on function public.editorial_storage_count() to authenticated;
commit;
