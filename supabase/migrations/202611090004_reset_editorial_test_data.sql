-- Herramienta temporal de pruebas. No borra nada al aplicar esta migración.
begin;
create or replace function public.reset_editorial_test_data(confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare target text;
begin
  if not coalesce(public.is_editorial_admin(), false) then
    raise exception 'Operación no autorizada' using errcode = '42501';
  end if;
  if confirmation is distinct from 'LIMPIAR' then
    raise exception 'Confirmación no válida' using errcode = '22023';
  end if;
  foreach target in array array[
    'editorial_page_views', 'editorial_plans', 'editorial_ideas',
    'editorial_sources', 'articles', 'tags', 'categories'
  ] loop
    if to_regclass(format('public.%I', target)) is not null then
      execute format('delete from public.%I where %I is not null', target,
        case when target = 'editorial_page_views' then 'day' else 'id' end);
    end if;
  end loop;
end;
$$;
revoke all on function public.reset_editorial_test_data(text) from public, anon;
grant execute on function public.reset_editorial_test_data(text) to authenticated;
commit;
