# Memoria compartida Claude Code + Codex

Estado de trabajo vivo para relevarse entre agentes sin revisar todo de nuevo. Reglas de uso: `AGENTS.md`, sección «Memoria compartida». Lo estable va en `CONTEXTO_IA.md`; aquí solo lo que cambia de una tarea a otra. Repositorio público: sin secretos ni datos personales.

## Sincronización

- Última actualización: 2026-11-16 · Codex
- Commit base: `5837dd3`
- Árbol al cerrar: con cambios sin commit (rediseño, navegación, portadas por categoría, memoria y contexto).

## En curso

- Rediseño editorial en la carpeta principal. Pendiente revisión visual integral de páginas, dispositivos y ambos temas.
- Rendimiento del portal: portada limitada a 17 noticias y transiciones de carga en categoría y artículo. Pendiente medir latencia con Supabase real en producción.

## Pendientes

- Usuario decide cuándo autorizar el push.
- Más populares: aplicar `202611160001_popular_articles.sql` en Supabase (incluye el contador de visitas) y comprobar que las visitas se registran (`/api/traffic`). Sin ella, «Más populares» cae a las más recientes.
- Portadas por categoría: aplicar `202611150001_category_covers.sql` en Supabase y probar el guardado real. Panel (escritorio y móvil, aviso de migración) y rotación del portal verificados en local con datos forzados.
- Instagram: comprobaciones con Meta real (bloque B de `entregables/Prompt-para-Codex.md`); requieren autorización expresa del usuario.
- Usuario decide: captura periódica de Instagram (dónde se ejecuta y con qué credencial), datos de ejemplo de X/YouTube/TikTok, «Novedades del día».
- Usuario decide: si `entregables/`, `output/` y `tmp/` (PDF, imágenes, script) deben quedar en el repositorio público. Ya están en el commit `8067974`.

## Decisiones vigentes

- 2026-11-13 · Audiencia y tráfico muestra datos simulados identificados (`lib/analytics-demo.ts`) hasta conectar el tráfico real.

## Registro

Más reciente arriba. Máximo 8 entradas; borrar las más antiguas (Git conserva el historial).

- 2026-11-16 · Codex · Aumenta el contraste de «Más populares» en temas claro y oscuro mediante `app/globals.css`. Sin commit.
- 2026-11-16 · Codex · Corrige scroll lateral, enlaza la marca superior al inicio y reorganiza el footer en `app/(public)/layout.tsx` y `app/globals.css`. Sin commit.
- 2026-11-16 · Claude Code · El carrusel de portadas ya no se pausa con el cursor encima (`components/cover-carousel.tsx`). Sin commit.
- 2026-11-16 · Claude Code · Más margen entre las noticias de «Últimas noticias» (final de `app/globals.css`, bloque `.archive-group`). Sin commit.
- 2026-11-16 · Claude Code · Inicio: «Lo más reciente» y «Últimas noticias» por fecha de creación (4 + 14 siguientes); «Más populares» = 3 con más visitas en 30 días (`getPopularArticles`, migración `202611160001_popular_articles.sql` sin aplicar; mientras tanto usa las más recientes). `lib/articles.ts`, `app/(public)/page.tsx`, tests. Sin commit.
- 2026-11-16 · Claude Code · Nuevo cargador del portal tipo maqueta de portada con tinta («Preparando la edición» / «Abriendo el reportaje») en categorías y noticias. `components/public-loader.tsx`, `categoria/[slug]/loading.tsx`, `noticia/[slug]/loading.tsx`, `globals.css`. Sin commit.
- 2026-11-16 · Claude Code · Carrusel de portadas cada 5 s con controles bajo «Leer el artículo» (`components/cover-carousel.tsx`, portal en cada `.hero-copy`); línea separadora entre portada y listado en categorías (`.category-cover-area`). Sin commit.
- 2026-11-15 · Claude Code · Inicio admite hasta 3 portadas (carrusel) y se guarda sin migración (`setHomeCovers`, `getHomeCovers`; `designateHomeCover`/RPC retirados). Categorías: listado en 2 columnas con tarjeta horizontal (`Cards wide`). Sin commit.
