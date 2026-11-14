# Memoria compartida Claude Code + Codex

Estado de trabajo vivo para relevarse entre agentes sin revisar todo de nuevo. Reglas de uso: `AGENTS.md`, sección «Memoria compartida». Lo estable va en `CONTEXTO_IA.md`; aquí solo lo que cambia de una tarea a otra. Repositorio público: sin secretos ni datos personales.

## Sincronización

- Última actualización: 2026-11-14 · Codex
- Commit base: `3091a52`
- Árbol al cerrar: limpio tras el commit de memoria.

## En curso

- Puesta en marcha de la coordinación local. Portada y reglas en main.

## Pendientes

- Fase 4: liberar `tarea-0`, probar los dos worktrees locales e integrar y retirar las pruebas.
- Usuario decide cuándo autorizar el push.
- Portada manual: aplicar `202611140001_home_cover.sql` en Supabase y comprobar el flujo con datos reales. Chrome en escritorio/móvil verificado con Supabase simulado.
- Instagram: comprobaciones con Meta real (bloque B de `entregables/Prompt-para-Codex.md`); requieren autorización expresa del usuario.
- Usuario decide: captura periódica de Instagram (dónde se ejecuta y con qué credencial), datos de ejemplo de X/YouTube/TikTok, «Novedades del día».
- Usuario decide: si `entregables/`, `output/` y `tmp/` (PDF, imágenes, script) deben quedar en el repositorio público. Ya están en el commit `8067974`.

## Decisiones vigentes

- 2026-11-13 · Audiencia y tráfico muestra datos simulados identificados (`lib/analytics-demo.ts`) hasta conectar el tráfico real.

## Registro

Más reciente arriba. Máximo 8 entradas; borrar las más antiguas (Git conserva el historial).

- 2026-11-14 · Codex · CLI, reservas y protocolo compartido. Respaldo de las 15 rutas iniciales en `refs/coord/respaldos/tarea-0/`. `3091a52`.
- 2026-11-14 · Claude Code · A pedido del usuario: 3 categorías nuevas (CULTURA, DEPORTES, CIENCIA Y TECNOLOGÍA) y 5 noticias completas publicadas vía el panel/Supabase real (una por categoría nueva más ECONOMÍA y ECONO), para ver el portal con contenido. Sin cambios de código ni commit.
- 2026-11-14 · Codex · Portada elegible en el gestor, respaldo automático y paginación del portal por inicio/categoría (`lib/articles.ts`, `app/(public)/`). `aad78ce`.
- 2026-11-13 · Usuario · Incorpora el protocolo de memoria compartida al historial. `917101f`.
- 2026-11-13 · Codex · Revisó y adoptó `MEMORIA_IA.md`; precisó en `AGENTS.md` cuándo repetir una auditoría. Sin commit.
- 2026-11-13 · Claude Code · Sistema de memoria compartida: crea `MEMORIA_IA.md`, añade sus reglas a `AGENTS.md`, la importa en `CLAUDE.md` y la cita en `CONTEXTO_IA.md` §1.1. Sin commit.
- 2026-11-13 · Usuario/Codex · `5121c41`…`8067974`: correcciones de Instagram (estados por bloque, límites, caché, fechas en Madrid), icono y estado activo de Redes Sociales en el menú, título del inicio, Audiencia con datos simulados, guía PDF en `output/` y `tmp/`.
- 2026-11-13 · Claude Code · Auditoría de Instagram y plan de analítica: `entregables/Auditoria-y-plan-de-analitica-Instagram.pdf` y `entregables/Prompt-para-Codex.md`.
