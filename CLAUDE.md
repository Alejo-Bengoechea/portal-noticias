# Claude Code: punto de entrada

Este archivo no repite reglas del proyecto. La fuente de verdad es `CONTEXTO_IA.md`, que Codex también lee; se carga a continuación junto con `AGENTS.md`.

@AGENTS.md
@CONTEXTO_IA.md

## Prioridad de instrucciones

1. Petición del usuario en la tarea actual.
2. `CONTEXTO_IA.md`: arquitectura, persistencia real, seguridad, validación y protocolo con Codex (§1.1).
3. `AGENTS.md`: reglas comunes a Codex y Claude. No editar el bloque `nextjs-agent-rules`; lo regenera `next dev`.
4. Este archivo: solo lo específico de Claude Code.

Si el código contradice la documentación, avisar al usuario y no corregir ninguno de los dos sin que lo pida.

## Al empezar cada sesión

1. `git status` y `git log --oneline -10`: puede haber trabajo de Codex, con o sin commit.
2. Si hay cambios sin commit que no son tuyos: no tocarlos, revertirlos ni incluirlos en tu commit. Preguntar.
3. Releer la sección de `CONTEXTO_IA.md` del área a tocar; §3 antes de prometer que algo "guarda".
4. Cambios de Next.js: leer la guía de `node_modules/next/dist/docs/` antes de escribir código.

## Específico de Claude Code

- **Sesiones en la nube** (claude.ai/code o app): trabajan sobre un clon de GitHub, no sobre la carpeta local del usuario. Si faltan dependencias, `npm ci` en ese entorno es correcto; no modifica archivos versionados. El trabajo llega a la carpeta local solo tras push a una rama `claude/...` y su fusión en `main`. Abrir pull request solo si el usuario lo pide.
- **Claude Code local** (Windows): usar `npm.cmd run <script>` en PowerShell, igual que Codex, y no trabajar a la vez que Codex sobre la misma carpeta.
- `.claude/settings.json` impide leer los `.env` reales. No sortear esa regla con comandos de shell.
- Responder en español sencillo: qué cambió, qué se comprobó y qué no se pudo comprobar. Distinguir hechos comprobados de suposiciones.
