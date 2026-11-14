# Claude Code: punto de entrada

La fuente común es `CONTEXTO_IA.md`, incluido el protocolo de colaboración (§1.1). No duplicar reglas aquí.

@AGENTS.md
@CONTEXTO_IA.md
@MEMORIA_IA.md

## Entorno de Claude Code

- En local, abrir la sesión en la carpeta del worktree creado por `scripts/coord.mjs iniciar` y ejecutar `validar`. Si la app ya creó el worktree, pedir su adopción antes de editar.
- En la nube, usar la rama y la base publicada de la reserva manual registrada por Codex. En Windows, usar `npm.cmd` en PowerShell y citar las rutas que llevan paréntesis o corchetes.
- `.claude/settings.json` restringe lecturas de archivos de entorno. No eludir estas restricciones mediante shell ni mostrar credenciales. Consultar `.env.example` para los nombres de variables.
