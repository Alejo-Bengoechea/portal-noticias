-- Lectura del inventario y borrado exclusivos del administrador editorial.
create policy list_editorial_admin on storage.objects for select to authenticated
using (bucket_id = 'editorial' and public.is_editorial_admin());

create policy delete_editorial_admin on storage.objects for delete to authenticated
using (bucket_id = 'editorial' and public.is_editorial_admin());
