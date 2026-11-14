# Claude Code: punto de entrada

La fuente común es `CONTEXTO_IA.md`, incluido el protocolo de colaboración (§1.1). No duplicar reglas aquí.

@AGENTS.md
@CONTEXTO_IA.md
@MEMORIA_IA.md

## Entorno de Claude Code

- Trabajar por turnos en la carpeta principal. En Windows usar `npm.cmd` en PowerShell. Si estás en un clon de la nube, el usuario decide cómo trasladar los cambios al entorno local.
- `.claude/settings.json` restringe lecturas de archivos de entorno. No eludir estas restricciones mediante shell ni mostrar credenciales. Consultar `.env.example` para los nombres de variables.
