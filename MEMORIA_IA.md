# Memoria compartida Claude Code + Codex

Estado de trabajo vivo para relevarse entre agentes sin revisar todo de nuevo. Reglas de uso: `AGENTS.md`, sección «Memoria compartida». Lo estable va en `CONTEXTO_IA.md`; aquí solo lo que cambia de una tarea a otra. Repositorio público: sin secretos ni datos personales.

## Sincronización

- Última actualización: 2026-11-17 · Claude Code
- Commit base: `db1fbe7`
- Árbol al cerrar: con cambios sin commit. Sites tiene una versión anterior (sin audiencia real).

## En curso

- Rediseño editorial en la carpeta principal. Pendiente revisión visual integral de páginas, dispositivos y ambos temas.
- Rendimiento del portal: portada limitada a 17 noticias y transiciones de carga en categoría y artículo. Pendiente medir latencia con Supabase real en producción.

## Pendientes

- Audiencia real: `202611170002_audience.sql` aplicada por el usuario el 2026-11-17. Falta publicar Sites (Codex). Después, comprobar que entran visitas desde la URL pública. Hasta publicar, Sites usa la recogida anterior (solo vistas, sin canal).
- Categoría «Resumen semanal»: aplicar `202611170001_weekly_summary_category.sql` en Supabase o crearla desde `/categorias/nueva` (más simple).
- Lotes `ejemplos/lote-20-noticias/` y `ejemplos/lote-20-noticias-2/` (20 noticias cada uno): creados y publicados en Supabase el 2026-11-16 desde el panel con la sesión del usuario (40 noticias publicadas en total). Cifras explicativas: contrastar; algunos enlaces de fuentes bloquean scripts (revisar a mano).
- Navegación del panel: probar con sesión iniciada el cambio entre vistas (el agente no puede iniciar sesión). Si Supabase usa claves JWT simétricas (legacy), `getClaims` sigue consultando Auth: valorar pasar a claves asimétricas en el panel de Supabase.
- Usuario decide cuándo autorizar el push.
- Más populares: aplicar `202611160001_popular_articles.sql` en Supabase (incluye el contador de visitas) y comprobar que las visitas se registran (`/api/traffic`). Sin ella, «Más populares» cae a las más recientes.
- Portadas por categoría: aplicar `202611150001_category_covers.sql` en Supabase y probar el guardado real. Panel (escritorio y móvil, aviso de migración) y rotación del portal verificados en local con datos forzados.
- Instagram: comprobaciones con Meta real (bloque B de `entregables/Prompt-para-Codex.md`); requieren autorización expresa del usuario.
- Usuario decide: captura periódica de Instagram (dónde se ejecuta y con qué credencial), datos de ejemplo de X/YouTube/TikTok, «Novedades del día».
- Usuario decide: si `entregables/`, `output/` y `tmp/` (PDF, imágenes, script) deben quedar en el repositorio público. Ya están en el commit `8067974`.

## Decisiones vigentes

- 2026-11-17 · Audiencia cuenta solo el portal publicado (nunca localhost), sin cookies ni IP. Al pasar a dominio propio, publicar allí; `TRAFFIC_HOSTS` elige dominios si conviven varios.

## Registro

Más reciente arriba. Máximo 8 entradas; borrar las más antiguas (Git conserva el historial).

- 2026-11-17 · Claude Code · Audiencia: botón recargar (`router.refresh`), barras de categoría clicables con top 3 noticias más vistas en vez del desplegable (`components/analytics-dashboard.tsx`, `lib/audience.ts`, `globals.css`). Tests 87/87, check OK. Sin commit.
- 2026-11-17 · Claude Code · Audiencia y tráfico con datos reales: `lib/audience.ts`, `lib/traffic-source.ts`, `/api/traffic`, `page-view.tsx`, `analytics-dashboard.tsx`, migración `202611170002_audience.sql`; se retira `lib/analytics-demo.ts`. Tests 87/87, check y build OK. Sin commit.
- 2026-11-17 · Claude Code · La flecha de «Portada actual» del panel abre el portal en otra pestaña (`components/editorial-home.tsx`). Sin commit.
- 2026-11-17 · Claude Code · Suscríbete ahora es `components/subscribe-section.tsx`, al final de inicio y de cada categoría. Migración `202611170001_weekly_summary_category.sql` (RESUMEN SEMANAL, sin aplicar). Typecheck OK. Sin commit.
- 2026-11-16 · Claude Code · «Últimas noticias» pasa a 1-3 / 4 / 3-1 / 3 (15 noticias): `components/cards.tsx`, `app/globals.css`, límite 19 en `lib/articles.ts`, `CONTEXTO_IA.md` §5. Tests 81/81. Sin commit.
- 2026-11-16 · Claude Code · Segundo lote de 20 noticias (5 por categoría) en `ejemplos/lote-20-noticias-2/`; creadas y publicadas desde el panel a petición del usuario. Truco: el editor ignora el primer archivo tras cargar la página y el panel del navegador debe estar visible. Sin commit.
- 2026-11-16 · Codex · Publica en Sites v5 la escala de escritorio al 80% (`app/globals.css`); comprobada en la URL pública sin solapamiento ni scroll lateral. Sin commit en main.
- 2026-11-16 · Codex · Publica el estado local actual en Sites, versión desplegada en `alejo-bengoechea-periodismo.tunedsnail1026.chatgpt.site`. Sin commit en main.
- 2026-11-16 · Claude Code · Redacta 20 noticias (5 por categoría: ECONOMÍA Y FINANZAS, EUROPA, INTERNACIONAL, POLÍTICA) en `ejemplos/lote-20-noticias/`, con 4 imágenes de Wikimedia Commons y fuentes verificadas; 7 llevan vídeo de YouTube. Las sube y publica a Supabase el mismo día (panel, a petición del usuario). Sin commit.
