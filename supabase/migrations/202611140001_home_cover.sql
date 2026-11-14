begin;

create function public.set_home_cover(article_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(public.is_editorial_admin(), false) then
    raise exception 'Operación no autorizada' using errcode = '42501';
  end if;

  -- Serializa la elección con otras elecciones, despublicaciones y eliminaciones.
  lock table public.articles in share row exclusive mode;
  if not exists (
    select 1 from public.articles where id = article_id and published_at <= now()
  ) then
    return false;
  end if;

  update public.articles set featured = false where featured and id <> article_id;
  update public.articles set featured = true where id = article_id and not featured;
  return true;
end;
$$;

revoke all on function public.set_home_cover(uuid) from public, anon;
grant execute on function public.set_home_cover(uuid) to authenticated;

commit;
