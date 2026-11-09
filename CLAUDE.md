# Claude Code: contexto de trabajo

Actualizado: **9 de noviembre de 2026**.

Antes de modificar el proyecto:

1. Leer [AGENTS.md](AGENTS.md).
2. Leer [CONTEXTO_IA.md](CONTEXTO_IA.md), la referencia consolidada de arquitectura, rutas, datos, comportamiento y validación.
3. Para cambios de Next.js, consultar la guía relevante de `node_modules/next/dist/docs/` antes de escribir código. No asumir APIs de otras versiones.

## Reglas esenciales

- Trabajar localmente. **No publicar ni actualizar Sites sin petición explícita del usuario en la tarea actual.** `sites-release/` es histórico; no sincronizarlo.
- No divulgar `.env.local`, usar service-role en el cliente ni desactivar auth/RLS para probar. Hay un único administrador; cada escritura vuelve a autorizarse en el servidor.
- Responder y documentar en español sencillo. El usuario tiene poca experiencia técnica; ejecutar las peticiones de código, no quedarse solo en planes.
- El creador JSON/componentes **todavía no crea/publica noticias en Supabase**: Crear/Guardar borrador generales están deshabilitados. Hay copias locales explícitas recuperables; no autoguardado general.
- No confundir formato editorial JSON con Tiptap de `articles.body`, noticias de muestra con filas reales, ni fuentes del directorio privado con citas de una noticia.
- Organización/ideas/fuentes guardan en Supabase solo con las tablas habilitadas; tabla ausente permite modo local identificado. No ocultar fallos de permisos o red cambiando a local.
- No asumir que las migraciones se aplicaron por existir en disco. Las recientes se prepararon, pero su estado remoto no está verificado.
- Conservar grises oscuros, Inter, barra Codex, estructura móvil y comportamiento actual. El inicio ahora es una mesa de trabajo, no las tres tarjetas antiguas.

## Referencias rápidas

- Carpeta: `C:\Users\alejo\Desktop\periodismo-alejodice`.
- Panel privado: `/mesa-editorial-7k4n`; rutas Organización y Fuentes ya implementadas.
- Nueva noticia se resuelve en `app/mesa-editorial-7k4n/articulos/[id]/page.tsx` con `id === 'nuevo'`.
- Validación JSON: `lib/news-import.ts`. Persistencia organizativa: `components/workspace-common.tsx` y `workspace-actions.ts`.
- Scripts PowerShell: `npm.cmd run dev`, `npm.cmd run check`, `npm.cmd run build`.
- No borrar `.next` ni reinstalar dependencias por rutina. Para documentación solamente, revisar coherencia/enlaces; no hacen falta pruebas de aplicación.

Actualizar `CONTEXTO_IA.md` cuando cambie el comportamiento real, reemplazando instrucciones obsoletas en lugar de añadir un historial contradictorio.
