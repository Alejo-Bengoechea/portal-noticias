begin;
-- Distingue el cuerpo Tiptap del editor clásico del documento propio del creador por
-- componentes (bloques de tabla, gráfico, nota editorial, texto+imagen, etc., sin
-- equivalente en Tiptap). El valor por defecto conserva el comportamiento de las filas
-- existentes sin tocarlas.
alter table public.articles
  add column body_format text not null default 'tiptap' check (body_format in ('tiptap', 'editorial'));
commit;
