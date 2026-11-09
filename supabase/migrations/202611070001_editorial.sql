begin;
create table public.editorial_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table public.editorial_admin enable row level security;
revoke all on public.editorial_admin from anon, authenticated;
create function public.is_editorial_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.editorial_admin where user_id = auth.uid()) $$;
revoke all on function public.is_editorial_admin() from public;
grant execute on function public.is_editorial_admin() to authenticated;

create table public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 1 and 60),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create table public.tags (like public.categories including all);
create table public.articles (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (length(title) between 1 and 160),
 subtitle text not null default '',
 author text not null check (length(author) between 1 and 100),
 body jsonb not null check (jsonb_typeof(body) = 'object'),
 category_id uuid references public.categories on delete set null,
 tag_ids uuid[] not null default '{}',
 cover_url text,
 cover_alt text not null default '',
 featured boolean not null default false,
 published_at timestamptz
);
create index articles_published on public.articles(published_at desc) where published_at is not null;
create index articles_category on public.articles(category_id, published_at desc);
alter table public.articles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
grant select on public.articles, public.categories, public.tags to anon, authenticated;
grant insert, update, delete on public.articles, public.categories, public.tags to authenticated;
create policy read_published on public.articles for select to anon, authenticated using (published_at <= now());
create policy read_categories on public.categories for select to anon, authenticated using (true);
create policy read_tags on public.tags for select to anon, authenticated using (true);
create policy manage_articles on public.articles for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy manage_categories on public.categories for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy manage_tags on public.tags for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());

create function public.clean_article_tags() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.articles set tag_ids = array_remove(tag_ids, old.id) where old.id = any(tag_ids);
  return old;
end;
$$;
create trigger clean_article_tags before delete on public.tags for each row execute function public.clean_article_tags();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editorial', 'editorial', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']);
create policy upload_editorial on storage.objects for insert to authenticated
with check (bucket_id = 'editorial' and public.is_editorial_admin());
commit;
