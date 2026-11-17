-- Audiencia real: contador de vistas por página y día, más el canal de llegada de cada visita.
-- Autosuficiente e idempotente: incluye el contador de 202611070003_traffic.sql por si no estuviera
-- aplicado. No guarda IP, cookies, navegador ni direcciones de procedencia: solo totales por día.
begin;

create table if not exists public.editorial_page_views (
  day date not null,
  page_key text not null,
  views bigint not null default 1 check (views > 0),
  primary key (day, page_key)
);
alter table public.editorial_page_views enable row level security;
revoke all on public.editorial_page_views from anon, authenticated;
grant select on public.editorial_page_views to authenticated;
drop policy if exists read_editorial_traffic on public.editorial_page_views;
create policy read_editorial_traffic on public.editorial_page_views for select
to authenticated using (public.is_editorial_admin());

create table if not exists public.editorial_traffic_sources (
  day date not null,
  source text not null check (source in ('buscadores', 'redes', 'otras', 'directo')),
  visits bigint not null default 1 check (visits > 0),
  primary key (day, source)
);
alter table public.editorial_traffic_sources enable row level security;
revoke all on public.editorial_traffic_sources from anon, authenticated;
grant select on public.editorial_traffic_sources to authenticated;
drop policy if exists read_editorial_traffic_sources on public.editorial_traffic_sources;
create policy read_editorial_traffic_sources on public.editorial_traffic_sources for select
to authenticated using (public.is_editorial_admin());

create or replace function public.record_editorial_view(page_path text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target text;
begin
  if page_path in ('/', '/buscar', '/derechos', '/privacidad') then
    target := page_path;
  elsif page_path like '/noticia/%' then
    select 'article:' || id::text into target from public.articles
    where slug = substring(page_path from 10) and published_at <= now();
  elsif page_path like '/categoria/%' then
    select 'category:' || id::text into target from public.categories
    where slug = substring(page_path from 12);
  end if;
  if target is not null then
    insert into public.editorial_page_views (day, page_key)
    values ((now() at time zone 'Europe/Madrid')::date, target)
    on conflict (day, page_key) do update set views = editorial_page_views.views + 1;
  end if;
end;
$$;
revoke all on function public.record_editorial_view(text) from public;
grant execute on function public.record_editorial_view(text) to anon, authenticated;

-- Vista de página y, si es la primera de la visita, su canal de llegada.
create or replace function public.record_editorial_visit(page_path text, entry_source text default null) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.record_editorial_view(page_path);
  if entry_source in ('buscadores', 'redes', 'otras', 'directo') then
    insert into public.editorial_traffic_sources (day, source)
    values ((now() at time zone 'Europe/Madrid')::date, entry_source)
    on conflict (day, source) do update set visits = editorial_traffic_sources.visits + 1;
  end if;
end;
$$;
revoke all on function public.record_editorial_visit(text, text) from public;
grant execute on function public.record_editorial_visit(text, text) to anon, authenticated;

commit;
