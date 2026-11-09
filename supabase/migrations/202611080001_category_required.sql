begin;
-- Protege nuevas escrituras sin modificar ni reclasificar noticias existentes.
-- NOT VALID permite aplicar la regla aunque haya filas antiguas pendientes de revisar.
alter table public.articles add constraint articles_category_required_after_publication
  check (category_id is not null or (published_at is null and not ever_published)) not valid;
commit;
