begin;
create table public.editorial_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  scheduled_on date not null check (scheduled_on between date '1900-01-01' and date '2200-12-31'),
  state text not null default 'pendiente' check (state in ('pendiente','en_produccion','preparada')),
  priority text not null default 'normal' check (priority in ('normal','alta')),
  notes text not null default '' check (length(notes) <= 3000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.editorial_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  notes text not null default '' check (length(notes) <= 3000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.editorial_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  kind text not null default 'persona' check (kind in ('persona','organismo','medio','documentacion')),
  organization text not null default '' check (length(organization) <= 120),
  url text not null default '' check (length(url) <= 2048 and (url = '' or url ~ '^https?://')),
  email text not null default '' check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 60),
  notes text not null default '' check (length(notes) <= 3000),
  favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index editorial_plans_schedule on public.editorial_plans(scheduled_on, state);
create function public.touch_editorial_workspace() returns trigger
language plpgsql set search_path = '' as $$
begin new.created_at := old.created_at; new.updated_at := now(); return new; end;
$$;
create trigger touch_editorial_plans before update on public.editorial_plans for each row execute function public.touch_editorial_workspace();
create trigger touch_editorial_ideas before update on public.editorial_ideas for each row execute function public.touch_editorial_workspace();
create trigger touch_editorial_sources before update on public.editorial_sources for each row execute function public.touch_editorial_workspace();
alter table public.editorial_plans enable row level security;
alter table public.editorial_ideas enable row level security;
alter table public.editorial_sources enable row level security;
revoke all on public.editorial_plans, public.editorial_ideas, public.editorial_sources from anon;
grant select, insert, update, delete on public.editorial_plans, public.editorial_ideas, public.editorial_sources to authenticated;
create policy admin_editorial_plans on public.editorial_plans for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy admin_editorial_ideas on public.editorial_ideas for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy admin_editorial_sources on public.editorial_sources for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
commit;
