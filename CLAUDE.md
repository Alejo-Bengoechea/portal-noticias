# Claude Code: punto de entrada

La fuente común es `CONTEXTO_IA.md`, incluido el protocolo de colaboración (§1.1). No duplicar reglas aquí.

@AGENTS.md
@CONTEXTO_IA.md
@MEMORIA_IA.md

## Entorno de Claude Code

- En la nube se trabaja sobre un clon de GitHub, no sobre la carpeta local. Usar ramas separadas para proponer cambios y seguir el protocolo común para integrarlos.
- En Windows usar `npm.cmd` en PowerShell. Para trabajo simultáneo, usar clones o worktrees distintos.
- `.claude/settings.json` restringe lecturas de archivos de entorno. No eludir estas restricciones mediante shell ni mostrar credenciales. Consultar `.env.example` para los nombres de variables.
