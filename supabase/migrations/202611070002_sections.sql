insert into public.categories (name, slug)
values ('Internacional', 'internacional'), ('España', 'espana'), ('Economía', 'economia')
on conflict (slug) do nothing;
