# Memoria compartida Claude Code + Codex

Estado de trabajo vivo para relevarse entre agentes sin revisar todo de nuevo. Reglas de uso: `AGENTS.md`, sección «Memoria compartida». Lo estable va en `CONTEXTO_IA.md`; aquí solo lo que cambia de una tarea a otra. Repositorio público: sin secretos ni datos personales.

## Sincronización

- Última actualización: 2026-11-15 · Codex
- Commit base: `cc26bb1`
- Árbol al cerrar: con cambios sin commit del protocolo y del rediseño del portal.

## En curso

- Rediseño editorial y temas del portal en la carpeta principal. Pendiente revisión visual, accesibilidad y cobertura completa de colores en ambos temas.

## Pendientes

- Usuario decide cuándo autorizar el push.
- Portada manual: aplicar `202611140001_home_cover.sql` en Supabase y comprobar el flujo con datos reales. Chrome en escritorio/móvil verificado con Supabase simulado.
- Instagram: comprobaciones con Meta real (bloque B de `entregables/Prompt-para-Codex.md`); requieren autorización expresa del usuario.
- Usuario decide: captura periódica de Instagram (dónde se ejecuta y con qué credencial), datos de ejemplo de X/YouTube/TikTok, «Novedades del día».
- Usuario decide: si `entregables/`, `output/` y `tmp/` (PDF, imágenes, script) deben quedar en el repositorio público. Ya están en el commit `8067974`.

## Decisiones vigentes

- 2026-11-13 · Audiencia y tráfico muestra datos simulados identificados (`lib/analytics-demo.ts`) hasta conectar el tráfico real.

## Registro

Más reciente arriba. Máximo 8 entradas; borrar las más antiguas (Git conserva el historial).

- 2026-11-15 · Claude Code · A pedido del usuario: 20 noticias de prueba (lorem ipsum, con portada e imagen, 4 por categoría) creadas y publicadas en Supabase real. Sin cambios de código ni commit. Con el panel del navegador oculto las páginas no cargan.
- 2026-11-15 · Codex · Ajusta enlaces, tipografía y distribución de noticias; amplía la ilustración. `components/cards.tsx`, `app/(public)/page.tsx`, `app/globals.css`. Sin commit.
- 2026-11-15 · Codex · Simplifica selector, ajusta cabecera e ilustración y muestra tres noticias recientes. `app/(public)/`, `app/globals.css`. Sin commit.
- 2026-11-15 · Codex · Reorganiza inicio en más populares, lo más reciente y últimas noticias. Popularidad pendiente de métricas reales. `app/(public)/page.tsx`. Sin commit.
- 2026-11-15 · Codex · Añade temas claro, oscuro y automático al portal. `components/theme-switcher.tsx`, `app/globals.css`. Sin commit.
- 2026-11-15 · Codex · Ajusta cabecera, ilustración, fechas y paginación de cuatro noticias. `app/(public)/`, `components/cards.tsx`. Sin commit.
- 2026-11-14 · Codex · Compacta portada y últimas noticias; centra categorías y añade lupa. `app/(public)/layout.tsx`, `app/globals.css`. Sin commit.
- 2026-11-14 · Codex · Ajusta tipografía, categoría activa y buscador del portal. `components/public-nav-link.tsx`, `app/globals.css`. Sin commit.
