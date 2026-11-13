# Prompt para Codex: memoria compartida con Claude Code

Copia este texto en Codex.

---

Trabajas en `C:\Users\alejo\Desktop\periodismo-alejodice` alternándote con Claude Code sobre los mismos archivos. Para no tener que revisar todo lo que hizo el otro agente en cada relevo, Claude Code implementó un sistema de memoria compartida. Revísalo, corrígelo si hace falta y adóptalo desde ahora como parte permanente de tu trabajo, sin que el usuario tenga que volver a pedírtelo.

## Cómo funciona

- **`MEMORIA_IA.md`** (raíz): relevo vivo entre agentes, en cinco secciones breves:
  - **Sincronización:** fecha, agente, commit base y estado del árbol al cerrar.
  - **En curso.**
  - **Pendientes.**
  - **Decisiones vigentes.**
  - **Registro:** máximo 8 entradas de una o dos líneas, la más reciente arriba.
- **`AGENTS.md`**, sección «Memoria compartida»: las reglas obligatorias de lectura y actualización. Es la fuente única de esas reglas y la leen los dos agentes, porque `CLAUDE.md` importa `AGENTS.md`.
- **`CLAUDE.md`** importa `@MEMORIA_IA.md`, así que Claude Code recibe la memoria cargada en cada sesión. Tú la lees al empezar: es un archivo corto.
- **`CONTEXTO_IA.md` §1.1** cita la memoria en el protocolo común. Reparto: `CONTEXTO_IA.md` guarda lo estable (arquitectura, reglas, estado consolidado) y `MEMORIA_IA.md` lo que cambia entre tareas.
- **Sin hooks.** Se descartaron a propósito:
  - Claude Code ya carga la memoria por la importación.
  - Un hook de cierre que obligue a actualizarla avisaría también en tareas de solo lectura y gastaría tokens.
  - No hay un mecanismo equivalente garantizado en ambos agentes.

## Ciclo de cada tarea, desde ya

**Al empezar:**

1. Lee `MEMORIA_IA.md`.
2. Ejecuta `git status --short` y `git log --oneline <commit base>..HEAD`.
3. Revisa en detalle solo los commits o archivos modificados que no figuren en el Registro. Lo registrado no se vuelve a auditar.

**Al terminar** cualquier tarea que cambie archivos, tome una decisión o deje algo pendiente, aunque quede a medias:

1. Actualiza Sincronización.
2. Reescribe En curso y Pendientes.
3. Añade una entrada arriba del Registro y recorta a 8.
4. Mueve a `CONTEXTO_IA.md` las decisiones que ya sean estables.
5. Si haces commit, incluye la memoria en él.

**Estilo:** español, frases cortas, rutas en vez de explicaciones, sin diffs ni código, menos de 60 líneas en total. Nada de secretos ni datos personales: el repositorio es público. Las tareas que no cambian nada no se registran. Los cambios hechos a mano por el usuario se registran como «Usuario».

## Qué te pido ahora

1. **Lee** `MEMORIA_IA.md`, la sección «Memoria compartida» de `AGENTS.md`, `CLAUDE.md` y `CONTEXTO_IA.md` §1.1. Comprueba con `git status` y `git diff` qué cambió Claude Code. Es una implementación sin commit: `MEMORIA_IA.md` es nuevo; `AGENTS.md`, `CLAUDE.md` y `CONTEXTO_IA.md` tienen cambios pequeños, y está este prompt en `entregables/`.
2. **Verifica:**
   - Que las reglas te resultan aplicables tal cual y que no contradicen otras instrucciones del proyecto.
   - Que la memoria refleja el estado real de Git.
   - Que nada de lo añadido a `AGENTS.md` choca con el bloque que regenera `next dev` (entre los comentarios `BEGIN/END:nextjs-agent-rules`).
3. **Corrige o mejora** lo que haga falta, con cambios mínimos y sin añadir dependencias ni hooks salvo que haya una razón clara. Las reglas deben seguir viviendo en un solo sitio (`AGENTS.md`), para que ambos agentes las lean igual.
4. **Adopta la metodología** a partir de esta misma tarea: al terminar, actualiza `MEMORIA_IA.md` registrando tu revisión, y quita de Pendientes el punto «Codex: revisar y adoptar el sistema de memoria compartida».
5. **No hagas commit, push ni publicación** salvo que el usuario lo pida. Respeta `AGENTS.md` y `CONTEXTO_IA.md`.
6. **Responde al usuario** en español sencillo: qué comprobaste, qué cambiaste y por qué, y confirma que seguirás este ciclo en todas las tareas futuras.
