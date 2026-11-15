-- Portadas por categoría: cada categoría puede tener de 1 a 3 noticias destacadas,
-- en un orden fijo (posición 1, 2 y 3) que el portal muestra en rotación.
begin;

alter table public.articles
  add column category_cover_position smallint
  check (category_cover_position between 1 and 3);

-- Una posición solo puede estar ocupada por una noticia dentro de cada categoría.
create unique index articles_category_cover
  on public.articles(category_id, category_cover_position)
  where category_cover_position is not null;

-- Si una noticia cambia de categoría o deja de estar publicada, deja de ser portada.
create function public.clear_category_cover()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_cover_position is not null
    and (new.category_id is distinct from old.category_id or new.published_at is null) then
    new.category_cover_position := null;
  end if;
  return new;
end;
$$;

create trigger clear_category_cover before update on public.articles
for each row execute function public.clear_category_cover();

-- Sustituye en una sola transacción las portadas de una categoría.
-- Devuelve false si la lista no es válida (más de 3, repetidas, no publicadas o de otra categoría).
create function public.set_category_covers(category uuid, article_ids uuid[])
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ids uuid[] := coalesce(article_ids, '{}');
begin
  if not coalesce(public.is_editorial_admin(), false) then
    raise exception 'Operación no autorizada' using errcode = '42501';
  end if;

  if cardinality(ids) > 3
    or cardinality(ids) <> (select count(distinct value) from unnest(ids) as value) then
    return false;
  end if;

  -- Serializa con otras elecciones de portada, despublicaciones y cambios de categoría.
  lock table public.articles in share row exclusive mode;

  if (select count(*) from public.articles
      where id = any(ids) and category_id = category and published_at <= now()) <> cardinality(ids) then
    return false;
  end if;

  update public.articles set category_cover_position = null
  where category_id = category and category_cover_position is not null;

  update public.articles as article set category_cover_position = chosen.position
  from unnest(ids) with ordinality as chosen(id, position)
  where article.id = chosen.id;

  return true;
end;
$$;

revoke all on function public.set_category_covers(uuid, uuid[]) from public, anon;
grant execute on function public.set_category_covers(uuid, uuid[]) to authenticated;

commit;
