-- Más populares: las noticias con más visitas de los últimos 30 días.
-- Es autosuficiente y se puede ejecutar más de una vez: incluye también el contador de visitas
-- de 202611070003_traffic.sql por si todavía no estuviera aplicado.
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

-- Solo devuelve los identificadores de las noticias publicadas más visitadas; no expone cifras.
create or replace function public.popular_articles(max_items integer default 3, days integer default 30)
returns table (id uuid)
language sql stable security definer set search_path = ''
as $$
  select a.id
  from public.editorial_page_views v
  join public.articles a on v.page_key = 'article:' || a.id::text
  where a.published_at <= now()
    and v.day >= (now() at time zone 'Europe/Madrid')::date - (least(greatest(days, 1), 90) - 1)
  group by a.id, a.published_at
  order by sum(v.views) desc, a.published_at desc, a.id
  limit least(greatest(max_items, 1), 10);
$$;
revoke all on function public.popular_articles(integer, integer) from public;
grant execute on function public.popular_articles(integer, integer) to anon, authenticated;

commit;
