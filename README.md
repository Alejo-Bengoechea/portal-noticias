# Alejo Bengoechea · Periodismo y análisis

El proyecto se desarrolla con dos asistentes de código, Codex y Claude Code, con Codex como coordinador de integración y Claude Code como colaborador, según lo indicado por el usuario. [CONTEXTO_IA.md](CONTEXTO_IA.md) es la referencia común e incluye el protocolo para trabajar juntos (§1.1). Codex entra por [AGENTS.md](AGENTS.md) y Claude Code por [CLAUDE.md](CLAUDE.md). Contexto consolidado al 11 de noviembre de 2026.

El creador permite editar una noticia importada desde JSON o construirla con componentes. **Guardar borrador** guarda el trabajo en Supabase y admite campos incompletos en noticias nunca publicadas. **Crear** valida el contenido y guarda la noticia lista para publicar desde el gestor. Los errores aparecen en una checklist flotante que lleva a cada campo. El selector **Abrir borrador** muestra borradores editoriales guardados. Si falla la consulta, el editor abre y el selector avisa.

El inicio reúne el resumen de Supabase, borradores recientes y portada. El menú incluye gestores separados de noticias y borradores, Organización, Fuentes y Multimedia. Audiencia y tráfico muestra un estado vacío hasta conectar las métricas reales.

Portal editorial en español con Next.js, React, TypeScript y Tailwind CSS. El contenido y las cuentas viven en Supabase. El cuerpo se guarda como JSON editorial o Tiptap, según el editor de la noticia. Desde el gestor, primero hay que despublicar una noticia publicada para editarla, en ambos formatos.

## Ejecutar en local

Usa Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Abre http://localhost:3000. Sin variables de Supabase, el portal muestra un estado vacío. El panel está en http://localhost:3000/mesa-editorial-7k4n.

```sh
npm test
npm run check
npm run build
npm start
```

## Habilitar Supabase

1. Crea un proyecto de Supabase y revisa la tabla de migraciones en [CONTEXTO_IA.md](CONTEXTO_IA.md#6-seguridad-y-configuración-externa). Aplica las que necesite tu instalación en orden desde SQL Editor o con Supabase CLI. En un proyecto existente, comprueba primero cuáles se aplicaron. Aplica la carga inicial de categorías solo si quieres esas categorías.
2. En Authentication, desactiva el registro público y crea manualmente el único usuario editorial con correo y contraseña. Copia su UUID.
3. En SQL Editor, asigna el UUID a la única fila de autorización. Sustituye el valor de ejemplo por el UUID real.

   ```sql
   insert into public.editorial_admin (user_id)
   values ('00000000-0000-0000-0000-000000000000');
   ```

4. Copia `.env.example` a `.env.local`. Introduce la URL del proyecto, la clave publicable de Supabase y el mismo UUID en `ADMIN_USER_ID`. Reinicia el servidor. La aplicación usa la sesión del administrador y políticas RLS para escribir.
5. Entra en `/mesa-editorial-7k4n` para gestionar las categorías, noticias y borradores. **Subir foto** guarda archivos JPG, PNG, WebP o AVIF de hasta 3 MB en el bucket `editorial`. **Cambiar URL** guarda la dirección del archivo externo. Los vídeos usan enlaces de YouTube.

El bucket de imágenes tiene lectura pública por URL. Los borradores están protegidos en la base de datos, pero quien conozca la URL exacta de una imagen subida puede abrirla. Eliminar una noticia conserva sus imágenes, porque pueden estar enlazadas desde otras piezas.

## Organización, ideas y fuentes

La migración [202611090002_editorial_workspace.sql](supabase/migrations/202611090002_editorial_workspace.sql) habilita sus tablas privadas en Supabase. Mientras no existan, las vistas trabajan con guardado local identificado, solo en ese navegador, y permiten descargar una copia. Después de aplicar la migración y recargar, ofrecen importar los registros locales en lotes sin sobrescribir IDs existentes. La copia local se conserva.

Los estados de la agenda organizan la producción; marcar una noticia como preparada no la publica. El directorio de fuentes es independiente de las fuentes citadas en una noticia. Los errores de conexión o permisos no cambian silenciosamente el almacenamiento de Supabase a local.

La biblioteca Multimedia usa las políticas de [202611090001_media_library.sql](supabase/migrations/202611090001_media_library.sql). La migración [202611110001_reset_editorial_storage.sql](supabase/migrations/202611110001_reset_editorial_storage.sql) también instala esas políticas y habilita la comprobación del inventario para la limpieza.

**Limpiar base de datos** es una herramienta temporal de pruebas. Requiere las funciones instaladas por las migraciones [202611090005_reset_safe_delete.sql](supabase/migrations/202611090005_reset_safe_delete.sql) y [202611110001_reset_editorial_storage.sql](supabase/migrations/202611110001_reset_editorial_storage.sql). Al confirmar con `LIMPIAR`, vacía las tablas editoriales y después elimina los archivos del bucket `editorial`. Si falla el borrado de archivos, el panel indica que la limpieza quedó parcial.

## Publicación

Hoy los avances se publican en Sites, solo cuando el usuario lo pide. El dominio propio y su proveedor están pendientes de decidir. Vercel es una opción posible:

Importa el proyecto como Next.js y añade las mismas variables de entorno. Configura `NEXT_PUBLIC_SITE_URL` con el dominio HTTPS final para los enlaces canónicos y el sitemap. Configura también ese dominio como Site URL en Supabase Auth. Aplica la migración y habilita la cuenta antes de publicar la versión definitiva.

