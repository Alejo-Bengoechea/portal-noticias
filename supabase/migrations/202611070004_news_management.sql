begin;
alter table public.articles
  add column created_at timestamptz,
  add column updated_at timestamptz,
  add column ever_published boolean not null default false;
-- La fecha histórica de creación y edición es desconocida.
update public.articles set ever_published = true where published_at is not null;
alter table public.articles alter column created_at set default now();
alter table public.articles alter column updated_at set default now();
create function public.track_editorial_article() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := now();
    new.ever_published := new.published_at is not null;
  else
    new.created_at := old.created_at;
    new.ever_published := old.ever_published or old.published_at is not null or new.published_at is not null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger track_editorial_article before insert or update on public.articles
for each row execute function public.track_editorial_article();
create index articles_created_at on public.articles(created_at desc);
commit;
