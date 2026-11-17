-- Categoría «Resumen semanal». Idempotente: no duplica si ya existe.
insert into public.categories (name, slug)
values ('RESUMEN SEMANAL', 'resumen-semanal')
on conflict (slug) do nothing;
