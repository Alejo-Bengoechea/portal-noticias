# Alejo Bengoechea · Periodismo y análisis

Para continuar el desarrollo con una IA, leer [AGENTS.md](AGENTS.md) y [CONTEXTO_IA.md](CONTEXTO_IA.md). Claude Code dispone de una entrada en [CLAUDE.md](CLAUDE.md). Contexto consolidado al 9 de noviembre de 2026.

El creador nuevo por JSON/componentes es una previsualización editable: sus botones generales Crear y Guardar borrador siguen deshabilitados y no guardan en Supabase. El aviso al sustituir un trabajo permite guardar una copia local recuperable; no hay autoguardado general. El editor de noticias ya guardadas sí tiene persistencia. Las 30 noticias del gestor de muestra son ficticias y no son filas de Supabase.

El inicio reúne resumen real, borradores recientes y portada. El menú incluye gestores separados de noticias/borradores, Organización (agenda e ideas), Fuentes (directorio privado) y Multimedia. Audiencia y tráfico muestra datos simulados identificados.

Portal editorial en español con Next.js, React, TypeScript y Tailwind CSS. El contenido y las cuentas viven en Supabase. Tiptap guarda el cuerpo de cada noticia como JSON, que el portal convierte a elementos React con enlaces validados y vídeos limitados a YouTube.

## Ejecutar en local

Usa Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Abre http://localhost:3000. Sin variables de Supabase, el portal muestra piezas de ejemplo identificadas en pantalla. El panel está en http://localhost:3000/mesa-editorial-7k4n.

```sh
npm run check
npm run build
npm start
```

## Habilitar Supabase

1. Crea un proyecto de Supabase y aplica las migraciones pendientes de `supabase/migrations/` en orden desde SQL Editor o con Supabase CLI. En un proyecto existente, comprueba primero cuáles se aplicaron; que el SQL exista en disco no confirma su ejecución remota.
2. En Authentication, desactiva el registro público y crea manualmente el único usuario editorial con correo y contraseña. Copia su UUID.
3. En SQL Editor, asigna el UUID a la única fila de autorización. Sustituye el valor de ejemplo por el UUID real.

   ```sql
   insert into public.editorial_admin (user_id)
   values ('00000000-0000-0000-0000-000000000000');
   ```

4. Copia `.env.example` a `.env.local`. Introduce la URL del proyecto, la clave publicable de Supabase y el mismo UUID en `ADMIN_USER_ID`. Reinicia el servidor. La aplicación usa la sesión del administrador y políticas RLS para escribir.
5. Entra en `/mesa-editorial-7k4n` para gestionar las categorías y las noticias existentes. Estas últimas pueden editarse y guardarse con el editor persistente. El nuevo creador JSON/componentes todavía no tiene conectado el alta/publicación en Supabase: no asumir que habilitar las tablas activa esos botones. Las imágenes sí pueden subirse inmediatamente como JPG, PNG, WebP o AVIF de hasta 3 MB; los vídeos usan enlaces de YouTube.

El bucket de imágenes tiene lectura pública por URL. Los borradores están protegidos en la base de datos, pero quien conozca la URL exacta de una imagen subida puede abrirla. Eliminar una noticia conserva sus imágenes, porque pueden estar enlazadas desde otras piezas.

## Organización, ideas y fuentes

La migración [202611090002_editorial_workspace.sql](supabase/migrations/202611090002_editorial_workspace.sql) habilita sus tablas privadas en Supabase. Mientras no existan, las vistas trabajan con guardado local identificado, solo en ese navegador, y permiten descargar una copia. Después de aplicar la migración y recargar, ofrecen importar los registros locales en lotes sin sobrescribir IDs existentes. La copia local se conserva.

Los estados de la agenda organizan la producción; marcar una noticia como preparada no la publica. El directorio de fuentes es independiente de las fuentes citadas en una noticia. Los errores de conexión o permisos no cambian silenciosamente el almacenamiento de Supabase a local.

La biblioteca Multimedia necesita también las políticas preparadas en [202611090001_media_library.sql](supabase/migrations/202611090001_media_library.sql). Consulta el contexto para los límites, permisos y migraciones restantes.

## Vercel

Importa el proyecto como Next.js y añade las mismas variables de entorno. Configura `NEXT_PUBLIC_SITE_URL` con el dominio HTTPS final para los enlaces canónicos y el sitemap. Configura también ese dominio como Site URL en Supabase Auth. Aplica la migración y habilita la cuenta antes de publicar la versión definitiva.

