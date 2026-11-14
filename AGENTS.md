<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Publication

Work on this project locally. Publish or update its Sites deployment only when the user explicitly requests publication in the current task.

## Project context

Read `CONTEXTO_IA.md` for the current architecture, editor behavior, security rules, and validation workflow before modifying this project.

## Collaboration

Codex and Claude Code follow the shared protocol in `CONTEXTO_IA.md` §1.1. The user determines their roles. Preserve unrelated work and never store credential notes in this public repository.

## Memoria compartida (obligatorio en cada tarea, sin que el usuario lo pida)

`MEMORIA_IA.md` es el relevo entre Codex y Claude Code: qué cambió, qué está en curso, qué falta y qué se decidió. Ambos agentes la leen al empezar y la actualizan al terminar.

**Al empezar** (antes de revisar código):

1. Leer `MEMORIA_IA.md` (Claude Code ya la recibe cargada por `CLAUDE.md`; Codex la abre).
2. Ejecutar `git status --short` y `git log --oneline <commit base>..HEAD`, con el commit base de la sección Sincronización.
3. Revisar en detalle los commits nuevos y archivos modificados que no figuren en el Registro. No repetir auditorías de lo registrado, salvo si la tarea actual lo requiere.

**Al terminar** cualquier tarea que cambie archivos, tome una decisión o deje algo pendiente (también si la tarea queda a medias):

1. Actualizar Sincronización: fecha, agente, commit base (`git rev-parse --short HEAD`) y si quedan cambios sin commit.
2. Reescribir En curso y Pendientes para que reflejen el estado real. Quitar lo resuelto.
3. Añadir arriba del Registro una entrada de una o dos líneas: `AAAA-MM-DD · Agente · qué cambió y dónde · commit o «sin commit»`. Mantener como máximo 8 entradas; borrar las más antiguas.
4. Anotar en Decisiones vigentes solo decisiones que el otro agente deba respetar. Si una decisión se vuelve estable, pasarla a `CONTEXTO_IA.md` y quitarla de aquí.
5. Si se hace commit, incluir `MEMORIA_IA.md` en el mismo commit.

**Reglas de estilo:** español, frases cortas, rutas en lugar de explicaciones, sin copiar diffs ni código. El archivo debe seguir siendo breve (objetivo: menos de 60 líneas). Las tareas de solo lectura o de respuesta que no cambian nada no se registran. Si el usuario hizo cambios a mano, registrarlos como «Usuario». Si hay conflicto de Git en este archivo, conservar las entradas de ambos lados.
