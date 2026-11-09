begin;

create table public.editorial_page_views (
  day date not null,
  page_key text not null,
  views bigint not null default 1 check (views > 0),
  primary key (day, page_key)
);
alter table public.editorial_page_views enable row level security;
revoke all on public.editorial_page_views from anon, authenticated;
grant select on public.editorial_page_views to authenticated;
create policy read_editorial_traffic on public.editorial_page_views for select
to authenticated using (public.is_editorial_admin());

create function public.record_editorial_view(page_path text) returns void
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

create function public.editorial_traffic_summary() returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with recent as (
    select page_key, sum(views) as views from public.editorial_page_views
    where day >= (now() at time zone 'Europe/Madrid')::date - 29
    group by page_key
  ), ranking as (
    select a.id, a.title, a.slug, coalesce(r.views, 0) as views
    from public.articles a left join recent r on r.page_key = 'article:' || a.id::text
    where a.published_at <= now()
    order by views desc, a.id
    limit 50
  )
  select jsonb_build_object(
    'total', coalesce((select sum(views) from recent), 0),
    'articles', coalesce((select jsonb_agg(to_jsonb(ranking) order by views desc, id) from ranking), '[]'::jsonb)
  )
  where public.is_editorial_admin();
$$;
revoke all on function public.editorial_traffic_summary() from public;
grant execute on function public.editorial_traffic_summary() to authenticated;

commit;
