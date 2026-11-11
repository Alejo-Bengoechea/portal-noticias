-- LIMPIEZA MANUAL: ejecutar solo para reiniciar el contenido editorial.
-- No es una migración ni se ejecuta al iniciar o desplegar la aplicación.
-- Conserva auth.users, editorial_admin, permisos, funciones y estructura.
-- Las fotos reales deben eliminarse desde Storage > editorial (no borrar
-- storage.objects por SQL: eso dejaría los archivos físicos huérfanos).
begin;
do $$
declare
  target text;
begin
  foreach target in array array[
    'editorial_page_views', 'editorial_plans', 'editorial_ideas',
    'editorial_sources', 'articles', 'tags', 'categories'
  ] loop
    if to_regclass(format('public.%I', target)) is not null then
      execute format('delete from public.%I', target);
    end if;
  end loop;
end;
$$;
commit;

-- Comprobación: las tres cifras deben ser cero.
select
  (select count(*) from public.articles) as noticias,
  (select count(*) from public.categories) as categorias,
  (select count(*) from public.tags) as etiquetas;
