# Contexto del proyecto para asistentes de código

Actualizado: **11 de noviembre de 2026**. Estado consolidado del código y referencia común para **Codex** (entra por [AGENTS.md](AGENTS.md)) y **Claude Code** (entra por [CLAUDE.md](CLAUDE.md)).

## 1. Reglas de trabajo

- Carpeta local del usuario: `C:\Users\alejo\Desktop\periodismo-alejodice` (Windows). Repositorio Git con remoto **público** en GitHub: `Alejo-Bengoechea/portal-noticias`, rama principal `main`.
- **No publicar ni actualizar Sites salvo petición explícita del usuario en la tarea actual.** Una autorización antigua no habilita otro despliegue. Hoy los avances se publican en Sites mediante Codex; el dominio propio y su proveedor están sin decidir (ver §6).
- `sites-release/` es una copia histórica de publicación, no la fuente activa; Git la registra como una referencia gitlink histórica, no como el código fuente activo de Next.js; localmente conserva archivos y dependencias propios. Los `alejo-sites-*.tar.gz` de la raíz son compilaciones históricas de Sites (vinext/wrangler), no código fuente. No sincronizarlos, modificarlos ni usarlos como referencia del código actual. Los archivos `*.tar.gz` dejan de versionarse y se conservan localmente, ignorados por Git; las copias antiguas siguen en el historial.
- **Nunca guardar contraseñas, claves ni notas con credenciales en archivos del proyecto**: el repositorio es público y el historial de Git las conserva aunque se borren. No leer/imprimir credenciales de `.env.local` en respuestas, logs o documentación. Consultar `.env.example` para los nombres de variables. No usar una clave service-role en el navegador.
- **Fase actual (11 de noviembre de 2026): funcionalidad real en marcha.** El creador por componentes ya guarda noticias y borradores de verdad en Supabase (§3, §8.2); se retiraron los datos ficticios del portal, los gestores y las estadísticas. Hay una herramienta temporal para vaciar Supabase durante las pruebas (§13), con estado de aplicación remota sin confirmar todavía. No tratar las migraciones aún no aplicadas ni la pérdida de datos de prueba como urgencias, pero sí tratar con cuidado cualquier dato ya guardado por el usuario a través del flujo real.
- No desactivar autenticación, RLS ni comprobaciones del administrador para probar. No crear/publicar/eliminar noticias reales como parte de una prueba visual.
- El usuario tiene poca experiencia en código: implementar lo pedido y explicar en español sencillo. Resolver decisiones rutinarias sin pedir confirmaciones innecesarias.
- Mantener accesibilidad, móvil y diseño existente. Los controles administrativos comparten Inter, radios y paleta gris con texto claro; acciones principales del editor son claras con texto oscuro, destructivas rojas. Generar en componentes mantiene fondo claro y texto negro tanto antes como después de cargar, también al hacer hover. Evitar dependencias redundantes. No cambiar funciones de negocio durante una tarea de documentación o diseño.
- Antes de escribir código de Next.js, leer la guía pertinente de **`node_modules/next/dist/docs/`**, como exige el bloque de `AGENTS.md`. No sustituirla por convenciones recordadas de otras versiones.
- No borrar `.next` ni otras carpetas por rutina. Comprobar rutas absolutas antes de una eliminación recursiva.
- Mantener este documento consolidado: reemplazar notas obsoletas, no añadir versiones contradictorias al final.

### 1.1 Protocolo común Codex + Claude Code

El usuario determina los roles. En la colaboración actual, Codex coordina la integración y Claude Code contribuye con cambios revisables. Ambos siguen este protocolo y preservan el trabajo ajeno.

1. **Al empezar:** revisar `git status`, `git log --oneline -10` y las secciones pertinentes de este documento. Consultar GitHub con `git fetch origin` cuando sea necesario; actualizar con `git pull --ff-only` solo con el árbol limpio y tras revisar los cambios.
2. **Cambios ajenos sin commit:** no revertirlos, reformatearlos ni incluirlos en el propio commit. Continuar con archivos independientes; aislar o pedir aclaración solo si existe un conflicto que no puede resolverse de forma segura. Proteger el trabajo antes de integrar ramas.
3. **Un agente a la vez sobre la misma carpeta.** Para trabajo simultáneo hacen falta worktrees o clones separados, además de ramas separadas. Una rama por sí sola no aísla los archivos.
4. **Cambios localizados:** evitar limpiezas fuera de alcance y dependencias redundantes. Las rutas, dependencias y capas necesarias para la tarea están autorizadas por su alcance; no requieren otra confirmación rutinaria. Seguir el estilo del archivo y leer la guía local de Next.js antes de modificar código.
5. **Al terminar:** commits con alcance claro y mensaje en español; excluir cambios ajenos y credenciales. Hacer push cuando esté autorizado por el usuario en la tarea. Un push de Git no autoriza publicar Sites.
6. **Si cambia el comportamiento real**, actualizar este documento en el mismo commit, reemplazando lo obsoleto. Corregir contradicciones relacionadas con la tarea; explicar las discrepancias relevantes que queden pendientes.
7. **Claude Code en la nube** trabaja en un clon de GitHub, normalmente en ramas `claude/...`. Sus cambios llegan al proyecto local tras fetch, revisión y fusión autorizada; los cambios locales solo serán visibles en la nube después del push correspondiente.
8. **Antes de declarar terminado:** cumplir §12 e informar de qué se comprobó y qué no. No aplicar migraciones ni mutar datos reales como prueba sin autorización específica.

## 2. Tecnología y ejecución

Next.js 16.x App Router, React 19, TypeScript, Tailwind CSS 4, Supabase PostgreSQL/Auth/Storage y Tiptap/ProseMirror. Node.js 22+. El PostgreSQL instalado en el ordenador no es el backend de esta integración. Gráficos con SVG/CSS nativos, sin biblioteca adicional.

```powershell
npm.cmd ci             # Solo si faltan dependencias
npm.cmd run dev        # http://localhost:3000; comprobar antes si ya está activo
npm.cmd test           # Tests de acciones, validación e importación, con Supabase simulado
npm.cmd run check      # next typegen + tsc --noEmit
npm.cmd run build      # next build --webpack
npm.cmd start          # Servir una compilación existente
```

`npm.cmd` evita restricciones de `npm.ps1` en PowerShell. En Linux/macOS o en sesiones en la nube se usan los mismos scripts con `npm` (`npm ci`, `npm run check`, `npm run build`). Windows ha bloqueado algunas escrituras de compilación en `.next` con EPERM; resolver el permiso concreto, sin borrar carpetas ni desactivar protecciones.

Ejecuta `npm.cmd test` para las pruebas de `tests/*.test.cjs`, que usan Supabase simulado. `article-editor` cubre fallos del selector y comprueba que Tiptap no consulta borradores. `draft-save` cubre autorización, validación y sustitución del estado de un JSON importado. `publication-status` cubre operaciones de estado y concurrencia. `reset-editorial` cubre el orden de limpieza y fallos de Storage. `public-nav`, `real-data-only`, `validation` y `news-validation` cubren navegación, ausencia de muestras, importación y validación. Las pruebas cargan TypeScript con `typescript.transpileModule`. Las pruebas de componentes usan JSX clásico para inspeccionar elementos sin `ReactDOM`. En la revisión local del 11 de noviembre de 2026 pasaron 65 pruebas, `check` y `build`.

## 3. Estado real de persistencia: leer antes de prometer funciones

| Área | Qué se guarda realmente |
| --- | --- |
| Creador nuevo por JSON/componentes | **Guarda de verdad en Supabase** (9 de noviembre de 2026, ver §8.1-§8.2). Crear valida en cliente y servidor; Guardar borrador permite contenido incompleto en noticias nunca publicadas, manteniendo autorización, límites y estructura básica. Ambos insertan o actualizan una fila real en `articles` con `body_format='editorial'` (el documento completo del creador, sin convertir a Tiptap) y redirigen a la edición de esa fila. Nunca publican directamente: la fila queda como borrador (`published_at` nulo) hasta que se publique desde el gestor. |
| Editor de una noticia ya guardada | `app/mesa-editorial-7k4n/articulos/[id]/page.tsx` bifurca por `body_format`: `'tiptap'` (noticias antiguas) abre `ArticleForm`/`saveArticle` como siempre; `'editorial'` (creadas con el creador nuevo) reabre `JsonDropzone` con el documento cargado, y `saveNewsDocument` actualiza esa misma fila en vez de crear una nueva. |
| Imágenes subidas | Se guardan inmediatamente en Storage, aunque la noticia siga siendo una preview sin guardar. |
| Gestores de noticias/borradores | Solo consultan Supabase, incluso con URLs antiguas `datos=ejemplo`. No hay muestras ni acciones simuladas. |
| Inicio / Mesa de trabajo | Consultas reales de noticias guardadas en Supabase. No hay borradores locales: el creador ya no guarda nada en el navegador. |
| Audiencia y tráfico | Estado vacío sin métricas inventadas. La vista todavía no consulta el RPC de tráfico real. El usuario reportó un error de permisos al limpiar editorial_page_views: su existencia y configuración remotas deben revisarse; el estado anterior que la daba por ausente ya no es fiable. La recogida real de visitas no se ha vuelto a verificar. |
| Organización, ideas y directorio de fuentes | Hoy **modo local** (solo en el navegador): las tablas de la migración 7 no existen en la base remota. Supabase si existen las tablas nuevas. Solo ante tabla ausente, modo local identificado; incluye copia descargable e importación posterior a Supabase. |
| Biblioteca multimedia | Inventario real del bucket `editorial`, sujeto a sus políticas. Sin la migración 6 (no aplicada en remoto) el inventario puede aparecer vacío y el borrado falla. La subida sí funciona (migración 1). |

Los formatos JSON editorial del creador y Tiptap de `articles.body` **no son intercambiables**. Se conviven sin convertir uno a otro: la columna `body_format` (migración 202611090003) distingue qué forma tiene `articles.body` fila por fila. El portal renderiza `RichText` para `'tiptap'` y `EditorialArticleBody` (en `news-preview.tsx`, el mismo renderizador del creador en modo solo lectura) para `'editorial'`, así que tablas, gráficos, notas editoriales y texto+imagen se ven igual en el portal que en la vista previa del creador, sin perder nada.

## 4. Rutas y navegación

Todas las rutas siguientes del panel llevan el prefijo `/mesa-editorial-7k4n`.

| Ruta | Función |
| --- | --- |
| `/` (del panel) | Mesa de trabajo: resumen, borradores recientes, portada y Nueva noticia |
| `/login` | Login privado rediseñado, sin línea horizontal superior |
| `/articulos/nuevo` | Creador por JSON/componentes |
| `/articulos/[id]` | Editor persistente de una noticia existente |
| `/categorias/nueva` | Crear, renombrar y gestionar categorías |
| `/publicaciones` | Gestor de noticias publicadas/despublicadas |
| `/borradores` | Gestor solo de borradores guardados; sin columnas Estado/Creación |
| `/organizacion` | Agenda editorial y banco de ideas |
| `/fuentes` | Directorio privado de fuentes/contactos |
| `/redes-sociales` | Panel privado de métricas de X, YouTube, Instagram y TikTok, con datos de ejemplo y detalle por red |
| `/estadisticas` | Estado vacío hasta conectar estadísticas reales |
| `/multimedia` | Biblioteca multimedia |
| `/media` | **Endpoint POST de subida**, no página |
| `/publicaciones/[id]/json` | Descargar JSON de una noticia real, con autenticación |

**`articulos/nuevo` se resuelve en `app/mesa-editorial-7k4n/articulos/[id]/page.tsx` cuando `id === 'nuevo'`. No crear una ruta redundante.** `/borradores` reutiliza la vista del gestor imponiendo `vista=borradores`; búsquedas, orden y paginación conservan esa separación. Ya no existen las pestañas Creadas/Borradores ni el título visible sobre la tabla.

Portal público: `/`, `/noticia/[slug]`, `/categoria/[slug]`, `/buscar`, `/derechos`, `/privacidad`, más metadatos, sitemap y endpoint de tráfico. No volver a exponer el panel en `/admin`.

## 5. Diseño que debe conservarse

- Portal, preview y panel usan grises oscuros, texto claro y acento rojo; estética editorial confidencial, minimalista, inspirada en Codex. No recuperar el antiguo fondo azul.
- Texto normal de noticias en **Inter Light 300**, negritas 700; títulos/subtítulos mantienen serif. Texto administrativo en Inter, con estilos heredados puntuales en la barra.
- Marca **Alejo Bengoechea** en texto; Alejo muy fino. Lema: "Periodismo y análisis". "Alejo Dice" es una denominación antigua errónea: no usarla en código, metadatos ni textos. Metadatos, firma por defecto del editor, ejemplos y portada sin imagen (`AB.`) ya usan la marca correcta. Las filas ya guardadas en Supabase pueden conservar la firma antigua; no se han modificado datos remotos. El nombre interno del paquete npm (`periodismo-alejodice`) coincide con la carpeta y no es visible. Menú contraíble hacia la izquierda, sin reflujo vertical ni letras asomando al cerrarlo.
- Identificación discreta `Mesa editorial / ÁREA EDITORIAL · PRIVADO` dentro del menú. No restaurar el rótulo flotante ni `admin-head` con línea superior.
- Pie del menú: **Ir al portal** amarillo, después **Cerrar sesión** rojo y el nombre centrado abajo, sin enlace. Ambos controles comparten `console-footer-action`: misma tipografía, tamaño, iconos, alineación y padding.
- Menú: Gestión editorial aparece antes de Mesa de trabajo. La ruta activa tiene fondo más claro y aria-current=page.
- Inicio: resumen arriba, borradores en columna amplia y portada al lado. No restaurar INICIO/BIENVENIDO con tres cuadrados.
- Las tablas ocupan el 90% del área sin menú; el ancho depende de `.manager-table-scroll`, no de un título opcional. Las tablas de gestores se ajustan al ancho incluso en móvil, con texto partido en celdas y sin anchos mínimos que provoquen scroll lateral. Calendarios/tablas no deben ensanchar la página.
- El CSS tiene muchas reglas sucesivas y media/container queries. Revisar especificidad y reglas anteriores antes de añadir otra sobrescritura. Respetar `prefers-reduced-motion`.
- Mantener `autoComplete="off"` en formularios/inputs/textarea/select nuevos. Esto solicita no sugerir historial, no borra el historial antiguo ni controla extensiones.
- No mostrar avisos de éxito (guardado, cambio de estado, copiado, operación completada o carga finalizada). Mantener errores y estados de trabajo en curso.
- Eliminar es la última acción del menú de noticias, gris en reposo y rojo al pasar el cursor. En categorías las acciones se alinean a la derecha; Eliminar se oculta durante la edición.
- Las tablas de gestores usan layout fijo con texto partido y contenedor sin scroll (overflow clip), con ajuste de 2px para bordes colapsados.

## 6. Seguridad y configuración externa

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_USER_ID`, `NEXT_PUBLIC_SITE_URL`. No documentar valores reales.

Publicación: hoy en Sites (vía Codex). El dominio propio y su proveedor no están decididos; la sección Vercel del README es una opción, no una decisión. Al elegirlo: configurar `NEXT_PUBLIC_SITE_URL` y la Site URL de Supabase Auth con ese dominio, y valorar cabeceras de seguridad (ver §12).

El 9 de noviembre de 2026 se retiró de la raíz una nota de texto que parecía contener la contraseña de Supabase y que estuvo publicada en el repositorio público. **Esa contraseña debe considerarse comprometida**; cambiarla en el panel de Supabase es una acción del usuario y no consta como hecha. El valor sigue en el historial de Git; no buscarlo ni citarlo.

`lib/supabase.ts`: `adminClient()` comprueba Supabase Auth, coincidencia con `ADMIN_USER_ID` y RPC `is_editorial_admin`. React `cache` solo deduplica comprobaciones dentro de una petición/render; no cachear sesiones globalmente. Cada acción/endpoint de escritura vuelve a autorizar y validar entradas. `proxy.ts` refresca la sesión. Una URL difícil de adivinar no sustituye permisos.

Supabase Auth debe tener registro público deshabilitado y el único administrador configurado. Las tablas y Storage usan RLS. Las fuentes/contactos y notas organizativas no tienen políticas públicas.

### Migraciones, en orden

| Archivo en `supabase/migrations/` | Propósito | Último estado remoto conocido |
| --- | --- | --- |
| `202611070001_editorial.sql` | Tablas iniciales, administrador, RLS, bucket editorial | Aplicada |
| `202611070002_sections.sql` | ESPAÑA, INTERNACIONAL, ECONOMÍA | **No.** La base tiene ESPAÑA (`espana`), NACIONAL (`nacional`) y TECNOLOGÍA (`tecnologia`), todas de prueba. No aplicar sin decidir antes las categorías definitivas |
| `202611070003_traffic.sql` | Recogida/resumen de tráfico real | Estado por revisar tras error de permisos de limpieza reportado por usuario |
| `202611070004_news_management.sql` | Fechas, histórico de publicación y trigger | Aplicada |
| `202611080001_category_required.sql` | Categoría obligatoria salvo borrador; restricción NOT VALID para no alterar histórico | Aplicada |
| `202611090001_media_library.sql` | SELECT/DELETE del inventario Storage, exclusivos del administrador | **No** |
| `202611090002_editorial_workspace.sql` | Agenda, ideas, fuentes, timestamps y RLS privada | **No** |
| `202611090003_article_body_format.sql` | Columna `body_format` (`'tiptap'`/`'editorial'`) en `articles`, por defecto `'tiptap'` | Aplicada |
| `202611090004_reset_editorial_test_data.sql` | RPC de limpieza atómica de tablas para pruebas, solo administrador | La RPC respondió en el panel |
| `202611090005_reset_safe_delete.sql` | Actualiza la RPC con condiciones WHERE para los borrados | Aplicación por confirmar |
| `202611110001_reset_editorial_storage.sql` | Políticas SELECT/DELETE y recuento autorizado de archivos en `editorial` | Aplicación por confirmar |

**Que un archivo exista no demuestra que se haya aplicado.** La columna Remoto procede de una consulta de solo lectura ejecutada por el usuario en SQL Editor el 9 de noviembre de 2026 (comprueba tablas, columnas, restricciones y políticas; el administrador también está configurado), más la aplicación confirmada por el usuario de `202611090003` el mismo día tras probar el guardado real del creador. Volver a comprobar tras aplicar cambios. Los agentes no tienen acceso a la base remota. Para validar el histórico de categorías, revisar primero filas antiguas sin categoría y luego validar la restricción.

## 7. Noticias, categorías y operaciones de tabla

### 7.1 Flujo de categorías (auditado el 9 de noviembre de 2026)

Crear, renombrar y eliminar categorías; asociarlas a una noticia desde el editor persistente o desde el menú de fila del gestor; mostrarlas en el portal público, filtrar por ellas y listarlas en el sitemap: **todo funciona de verdad contra Supabase**, sin superposición de muestras.

- Panel: `app/mesa-editorial-7k4n/categorias/nueva/page.tsx` + `CategoryManager`/`CategoryCard` listan y editan en una tabla (checkbox, Nombre, Noticias y columna de acciones sin título visible); `CategoryCard` ahora renderiza una fila, no una tarjeta; `manageTerm` en `actions.ts` crea/renombra/elimina con bloqueo si hay noticias asociadas.
- Asociar a una noticia: el `<select>` de `ArticleForm` (editor completo) y el diálogo "Cambiar categoría" de `NewsRowActions` (menú de fila del gestor, vía `changeNewsCategory`). Ambos exigen categoría salvo en borradores.
- Portal público: `categoria/[slug]/page.tsx` ya resolvía por slug de forma dinámica. El menú de `app/(public)/layout.tsx` tenía fijos Internacional/España/Economía: se cambió a leer `getTerms('categories')`, igual que el resto del portal. Si esa consulta falla, el menú se degrada a solo "Inicio" (con `.catch(() => [])`) en vez de romper también `/derechos` y `/privacidad`, que no dependían de Supabase. Cubierto por `tests/public-nav.test.cjs`.
- Pendiente, no implementado: el recuadro de portada sin imagen (`cover-art`, en `cards.tsx`) solo tiene variantes de color para los IDs de muestra `1`/`2`/`3`; con categorías reales (UUID) todas usan el color por defecto. Es solo estético.

### 7.2 Noticias y operaciones de tabla

`articles`: UUID, slug, título/subtítulo/firma, cuerpo (`body` + `body_format`: Tiptap o editorial, ver §3 y §8.2), `category_id`, `tag_ids`, portada, destacada y fechas. Estado: `published_at` no nulo → publicado; nulo con `ever_published` o `body.metadatos.estado='despublicado'` → despublicado/listo; nulo sin ninguno de estos marcadores → borrador. Crear asigna el marcador editorial listo sin falsear `ever_published`, que sigue siendo histórico real. Las consultas del gestor, inicio, selector y publicación contemplan ambos marcadores. Solo un borrador puede estar sin categoría.

- 15 filas iniciales y otras 15 al llegar al final, mediante IntersectionObserver y acción autenticada.
- Búsqueda por título/ID; orden por categoría, creación y modificación desde cabeceras. Borradores omite Estado/Creación y ordena por modificación por defecto.
- Checkbox de cabecera selecciona filas cargadas. Barra de selección: Eliminar con confirmación en ambos gestores, Publicar/Despublicar solo en noticias. Validación de servidor, máximo 500 IDs únicos. No permitir publicación rápida de borradores ni noticias sin categoría. Las noticias preparadas mediante Crear sí admiten su primera publicación.
- Publicar (en lote o por fila) solo cambia noticias despublicadas o preparadas mediante Crear; las ya publicadas conservan su `published_at` original y se ignoran en el lote. Despublicar solo cambia las publicadas. No reintroducir actualizaciones que reescriban la fecha de publicación de noticias ya publicadas.
- Menú por fila: publicar o despublicar según estado, copiar ID al portapapeles, cambiar categoría, descargar JSON y eliminar con confirmación. El título de la fila no es enlace. Editar está en el menú: habilitado para borradores y noticias despublicadas; deshabilitado para publicadas (requieren despublicar antes). No se muestra la columna ID.
- Categorías siempre en mayúsculas. Selección con checkbox por fila y seleccionar todas en cabecera. El nombre es texto hasta pulsar Editar; Guardar aparece tras un cambio, a la derecha de Eliminar. Cancelar la confirmación restaura el nombre y oculta Guardar. Renombrar conserva slug. Eliminar bloqueado si hay noticias asociadas, sin conteos ficticios.
- Eliminar una noticia no elimina sus imágenes de Storage.

## 8. Creador por JSON/componentes

Ambos modos usan `NewsComposer`, `NewsPreview` y `InlineNewsEditor`. Editar directamente en el contenido; no volver a montar el editor flotante amarillo ni formularios iniciales externos. Separación visual: datos, portada, cuerpo. Los controles de bloque permiten insertar/ordenar/quitar y deshacer la retirada; movimiento con animación. Inserción arriba/abajo salvo último bloque, que solo la ofrece arriba. No recuperar rótulos de tipo ni divisores de puntos. Ya no se muestra el mensaje para añadir el primer componente.

- Ctrl+B/I/U para negrita/cursiva/subrayado; conservar formato y enlaces. Enter en listas crea un elemento nuevo; Shift+Enter permite salto dentro del elemento.
- Selector propio de categorías en grises, con teclado/Escape/cierre exterior.
- Máximo tres etiquetas, eliminables; duplicadas se marcan en rojo en edición y se rechazan al importar JSON.
- Texto/imagen se intercambia con un pequeño botón central de flechas. En móvil se apila. En lectura, imágenes ampliables con `ZoomableImage` y cierre/Escape/fondo; edición conserva Subir foto/Cambiar URL.
- Vídeo: YouTube validado, `youtube-nocookie.com`; input se oculta tras insertar y Actualizar vídeo aparece sobre el reproductor.
- Fuentes de una noticia al final. Añadir fuente abre de inmediato su formulario y enfoca el nombre; las importadas quedan en lectura hasta Editar. Son distintas del directorio privado `/fuentes`.
- El área grande de JSON se contrae al abrir cualquier noticia, sea desde JSON o desde componentes. Ambos muestran la misma zona compacta de carga/arrastre y el mismo editor. Solo el modo JSON conserva a su lado Generar en componentes. El título Creación editorial / Editor de noticia aparece primero. Abrir borrador está alineado en la fila centrada de controles (últimos 100 borradores editoriales reales, con enlace al gestor completo). La carga de JSON y las acciones van debajo. Crear/Guardar borrador comparten diseño arriba y abajo, solo cuando hay un documento abierto. Solo el tipo de acción pulsado muestra Guardando…; ambas acciones se bloquean durante la petición. Pulsar Nueva noticia desde la propia ruta nuevo recarga esa vista y descarta el contenido en memoria. Los estados vacíos de categorías, gestores y audiencia se centran en su área de contenido. Abrir borrador muestra una sola flecha y cierra al pulsar fuera o Escape.
- Validar un archivo completo antes de cambiar el documento. Si falla, popup breve con ruta/campo y causa, sin perder el trabajo actual. Si es válido y hay cambios, ofrecer Cancelar / Reemplazar sin guardar (no se guardan borradores en el navegador: avisa antes de perder el trabajo).
- **No hay borradores locales.** Se retiró `lib/local-news-drafts.ts` y el guardado en `localStorage` a propósito (9 de noviembre de 2026): nada de la noticia persiste en el navegador fuera de la sesión de edición en memoria. Recargar la página pierde el trabajo no guardado en Supabase.

El selector consulta borradores solo al crear o editar noticias editoriales. Si falla el listado, el editor abre y el selector indica el fallo. La edición Tiptap prescinde de esa consulta.

### 8.1 Validación del creador

`lib/news-validation.ts` (`validateNewsDocument`) revisa el documento completo del creador —no el JSON importado, que usa el validador más estricto `parseNewsImport`— y devuelve **todos** los problemas encontrados a la vez, cada uno con la ruta exacta del campo, en vez de detenerse en el primero.

- Los botones **Crear** y **Guardar borrador** (en `JsonDropzone`) ejecutan esta validación al pulsarlos. `Crear` exige contenido válido, categoría y portada. `Guardar borrador` admite errores y campos vacíos para noticias nunca publicadas. El servidor conserva la estructura básica y un máximo de 1.500.000 caracteres; usa Borrador sin título/Sin firma solo en columnas de resumen cuando faltan, preservando el documento original, y genera slug UUID. Una categoría inexistente se guarda como null en la relación, preservando la selección en el documento. Las noticias ya publicadas alguna vez conservan validación estricta.
- Los errores aparecen en una checklist flotante que se puede mover, redimensionar y plegar. La lista se actualiza al editar. Al seleccionar un error, el editor desplaza la vista al campo o bloque y lo resalta en rojo tres veces. Con movimiento reducido, el resaltado es fijo y temporal. Los campos conservan `aria-invalid` mientras haya un error.
- Si no hay errores, se envía a `saveNewsDocument` (ver §8.2), que vuelve a validar en servidor antes de escribir.
- Los bloques nuevos del creador ya no llevan texto de relleno (antes "Lorem ipsum", "Nombre de la fuente", etc.): nacen vacíos y la validación exige completarlos. El gráfico de barras también nace vacío y exige entre 1 y 30 datos válidos antes de guardar. El marcador legacy `muestra: true` sigue rechazándose si aparece en contenido importado.
- La imagen de portada y las imágenes del cuerpo exigen URL y texto alternativo (accesibilidad); el campo de texto alternativo ahora es editable directamente bajo cada imagen en el creador.
- Cubierto por `tests/news-validation.test.cjs`.

### 8.2 Guardado real: Crear y Guardar borrador (9 de noviembre de 2026)

`saveNewsDocument` en `app/mesa-editorial-7k4n/actions.ts` recibe el documento completo. Crear y la edición de noticias con histórico de publicación ejecutan `validateNewsDocument` también en servidor. Los borradores nunca publicados permiten contenido incompleto, sin omitir autenticación, tamaño y estructura básica. Escribe en `articles`:

- `body`: el documento editorial completo, sin convertir; `body_format: 'editorial'`.
- `category_id`: se resuelve buscando el nombre de `metadatos.seccion` contra las categorías reales (`getTerms('categories')`); si no hay coincidencia, falla con un mensaje claro en vez de guardar una categoría inventada.
- `author`: se arma uniendo los nombres de `autores` con «, »; no hay más de un campo de firma en la tabla `articles`, así que varias firmas se muestran igual en el gestor pero se conservan completas dentro de `body.autores` para el portal.
- `tag_ids`: queda **vacío a propósito**. Las etiquetas del creador (`metadatos.etiquetas`) son texto libre, no términos de la tabla `tags`; no se crean términos automáticamente al guardar. Siguen visibles en el documento y en el portal (ver abajo), pero no participan del filtro relacional de etiquetas del gestor. Pendiente de decisión si se quiere unificarlas.
- `cover_url`/`cover_alt`: se resuelven desde `portada.recursoId` contra `recursos`.
- `published_at`: siempre null al insertar. Crear guarda `body.metadatos.estado='despublicado'` y pasa al gestor de noticias listo para publicar; Guardar borrador guarda estado borrador. Ninguno publica. Crear desde un borrador actualiza la misma fila y su slug, sin duplicarla. El historial `ever_published` no se modifica hasta publicar de verdad. Los borradores siguen sin publicación rápida. Al editar un borrador, las acciones son Crear/Guardar borrador; en una noticia creada son Guardar cambios/Guardar borrador.
- El servidor sobrescribe `body.metadatos.estado` según la acción solicitada y el historial de publicación. El valor de un JSON importado no decide el estado que se guarda.
- Con `id` (edición de una fila existente): actualiza esa fila en vez de insertar, exige que su `body_format` sea `'editorial'` (si no, el guardado se rechaza: esa fila se edita con el editor clásico) y aplica la misma regla de categoría obligatoria si la noticia ya se publicó alguna vez.
- Al terminar, `revalidatePath('/', 'layout')` y redirección a `/mesa-editorial-7k4n/articulos/{id}` (edición de la fila recién creada o actualizada), donde `JsonDropzone` se reabre con el documento cargado desde Supabase.

El portal público (`app/(public)/noticia/[slug]/page.tsx`) distingue `body_format` para renderizar y para las etiquetas mostradas: con `'editorial'` usa `EditorialArticleBody` y lista `body.metadatos.etiquetas` como texto (no las etiquetas relacionales, que quedan vacías para estas filas).

Probado de extremo a extremo el 9 de noviembre de 2026, junto con el usuario (que confirmó cada paso en su propio navegador, incluida la migración aplicada y el borrado final): crear con el creador, verificar la fila en Supabase, reabrir para editar (recupera todo correctamente) y comprobar que aparece en `/borradores`; la fila de prueba se eliminó al terminar. **No probado todavía:** publicar una noticia `'editorial'` desde el gestor y verla en el portal público ya en producción (el renderizador está implementado y compila, pero falta esa prueba visual en vivo).

### Formato y validación de JSON

`lib/news-import.ts` es la referencia: `parseNewsImport` se reexporta como `parseNewsPreview`; `normalizeNewsDocument` convierte una entradilla antigua en párrafo movible/eliminable y completa la fecha de actualización. Conserva una actualización válida, o usa publicación válida/instante de importación; la fecha se muestra salvo opción explícita false.

Raíz editorial: `versionEsquema`, `titular`, `subtitulo`, `metadatos`, `autores`, `fechas`, `portada`, `recursos`, `cuerpo`, `presentacion`. Cada bloque lleva ID único y tipo. Texto enriquecido mediante `spans` con `texto`, `marcas` y `enlace.href`; imágenes por `recursoId`. No aceptar HTML de embed arbitrario.

Paleta actual: `encabezado`, `parrafo`, `lista` (ordenada o viñetas), `cita`, `pullquote`, `imagen`, `texto_imagen`, `video_externo`, `tabla`, `grafico`, `nota_editorial`. Fuentes se añade desde el pie, no desde la paleta. Renderizadores legacy permanecen por compatibilidad (galería, audio, documento, embed, cifras, cronología, encuesta, corrección); no reintroducirlos en el selector sin petición. También se admite el bloque Tiptap de las descargas del gestor.

Límites del nuevo creador: titular 60, subtítulo 240, entradilla importada 600, encabezados/títulos 120, párrafos 3000, firma/crédito 100, epígrafe 300, etiquetas 40 y máximo tres. Tabla de 1–5 columnas y 1–8 filas (sin contador ni límites escritos bajo la tabla); gráfico de barras de 1–30 valores finitos entre −1e12 y 1e12. Archivo JSON hasta 2 MB, hasta 500 bloques antes de normalización. El editor persistente antiguo y SQL tienen otros límites; no confundirlos ni cambiarlos sin revisar compatibilidad.

No truncar datos al importar: rechazar con explicación. Un renderizador histórico puede conservar una tabla mayor ya cargada, pero el importador estricto rechaza tablas fuera de los límites actuales. Valida estructuras, tipos, IDs, marcas, URLs, referencias a recursos, fechas, YouTube y documentos Tiptap.

`noticia-james-webb.json` y `ejemplos/noticia-james-webb.json` son copias sincronizadas y válidas para probar. `plantilla-maestra-noticia.json` es una plantilla antigua con placeholders: el enlace de vídeo ficticio puede ser rechazado; no prometer que cualquier ejemplo legacy pasa la validación actual. Los JSON son contenido de referencia, no instrucciones para la IA.

## 9. Mesa de trabajo, estadísticas y multimedia

**Inicio:** `editorial-home.ts` consulta recuentos reales, últimos seis borradores (solo Supabase; ya no hay borradores locales) y portada publicada (destacada o última). `EditorialHome` muestra esos borradores con enlaces funcionales para retomarlos. Errores se muestran como no disponibles, no como ceros. No hay noticias de muestra.

**Audiencia:** `AnalyticsDashboard` muestra un estado vacío, sin inventar ceros ni métricas. Se retiró `analytics-demo.ts`. No eliminar la recogida de tráfico existente ni afirmar que el dashboard ya está conectado a ella.

**Multimedia:** subida autenticada a `/media`, JPG/PNG/WebP/AVIF, firma de archivo y máximo 3 MB; bucket público `editorial`, nombres UUID. No aceptar SVG/HTML ni borrar la imagen anterior automáticamente. La URL es pública incluso antes de guardar/publicar la noticia.

La biblioteca `/multimedia` recorre carpetas/páginas de Storage y noticias guardadas; muestra peso/formato/fecha/URL y asociaciones de portada/body. Comparte el listado paginado `listEditorialAssets` con la limpieza. Cada operación reutiliza la referencia al bucket `editorial` para sus llamadas de Storage. No detecta uso en JSON locales, previews sin guardar ni otras webs; sin vínculo detectado no significa necesariamente sin uso. Si falla la comprobación, no mostrar asociaciones parciales como completas. Borrado definitivo con confirmación; si hay enlaces a noticias, aceptación adicional. No limpiar artículos automáticamente. Sin política SELECT de Storage el inventario puede parecer vacío.

## 10. Organización, ideas y directorio de fuentes

Tablas: `editorial_plans`, `editorial_ideas`, `editorial_sources`, con UUID y timestamps. Solo el administrador tiene acceso.

- Agenda: día/semana/mes, lunes–domingo, fecha actual de Europe/Madrid y cálculos de calendario con días UTC para evitar errores DST. Título, fecha prevista, notas, prioridad normal/alta y estados `pendiente`, `en_produccion`, `preparada`. No publica noticias ni se vincula automáticamente a `articles`.
- Ideas: título/notas, editar/eliminar y Llevar a la agenda; copia la idea a una planificación conservando la original.
- Directorio: tipos `persona`, `organismo`, `medio`, `documentacion`; nombre, organización, web/documento, correo, teléfono, notas y favorita. Buscar/filtrar, abrir web/mail/teléfono, editar y eliminar con confirmación. No recoge automáticamente las fuentes de los artículos ni las añade a ellos.
- Servidor: `workspace-actions.ts` autoriza y valida campos/IDs/URLs, y revalida solo estas vistas. URLs HTTP/HTTPS sin credenciales; notas hasta 3000 caracteres.
- Lecturas completas paginadas en lotes de 500. **Solo** tabla ausente (`42P01` / `PGRST205`) activa modo local. Un error de conexión/permisos mantiene cloud con error y bloquea escrituras; no crear una copia local silenciosa de datos remotos inaccesibles.
- Almacenamiento local: `editorial.workspace.plans.v1`, `editorial.workspace.ideas.v1`, `editorial.workspace.sources.v1`. Leer antes de escribir; actualizar ante storage/focus; no sobrescribir datos corruptos ni perder cambios ante fallo de cuota. Copia descargable JSON.
- Tras aplicar la migración y recargar, importar locales en lotes de 50. `ignoreDuplicates` evita sobrescribir IDs cloud existentes; las copias locales se conservan. No aumentar lotes sin revisar el límite del cuerpo de Server Actions.

## 11. Mapa de archivos

| Responsabilidad | Archivos principales |
| --- | --- |
| Datos/autorización | `lib/supabase.ts`, `proxy.ts`, `lib/articles.ts` |
| Acciones de noticias/categorías | `app/mesa-editorial-7k4n/actions.ts` (incluye `saveArticle` para Tiptap y `saveNewsDocument` para el creador editorial), `bulk-news-actions.ts`, `news-actions.ts` |
| Inicio | `lib/editorial-home.ts`, `components/editorial-home.tsx` |
| Menú y login | `components/editorial-sidebar.tsx`, `editorial-login.tsx`, `admin-forms.tsx`, layout del panel |
| Importación y validación | `lib/news-import.ts`, `lib/news-validation.ts` (también usado en servidor por `saveNewsDocument`), `components/json-dropzone.tsx` |
| Composición y render editorial | `components/news-composer.tsx`, `news-preview.tsx` (incluye `EditorialArticleBody`, para el portal público), `lib/news-components.ts` |
| Edición inline | `components/inline-news-editor.tsx`, `inline-rich-text.tsx`, `imported-rich-block.tsx`, `lib/inline-format.ts` |
| Bloques | `news-text-image.tsx`, `news-table.tsx`, `news-bar-chart.tsx`, `news-video.tsx`, `news-sources.tsx`, `zoomable-image.tsx` |
| Noticias persistidas (Tiptap) | `components/article-form.tsx`, `rich-text.tsx`, ruta `articulos/[id]` (bifurca por `body_format`, ver §3 y §8.2) |
| Gestores | `news-manager-table.tsx`, `news-row-actions.tsx`, `infinite-news-manager.tsx`, `lib/news-management.ts`, `managed-news.ts` (solo tipos) |
| Categorías | `category-manager.tsx`, `category-card.tsx`, `admin-forms.tsx` |
| Multimedia | `lib/media-upload.ts`, `image-signature.ts`, `media-library.ts`, `components/media-library.tsx`, rutas media/multimedia |
| Organización/fuentes | `lib/editorial-workspace.ts`, `editorial-workspace-server.ts`, `components/workspace-common.tsx`, `editorial-planner.tsx`, `source-directory.tsx`, `workspace-actions.ts` |
| Audiencia pendiente de conexión | `components/analytics-dashboard.tsx` (estado vacío) |
| Diseño global | `app/globals.css` y fuentes locales de `public/fonts/` |

`components/preview-text-editor.tsx` y `components/news-component-fields.tsx` no se importan desde ningún sitio; otros formularios antiguos pueden permanecer en disco sin usarse en el flujo actual. Buscar sus imports antes de reutilizarlos; no reactivar el editor flotante ni una paleta retirada por encontrar un archivo existente.

## 12. Verificación y pendientes

- Ejecutar `npm.cmd test`, `npm.cmd run check` y `npm.cmd run build` para cambios de código relevantes. Ajustes solo Markdown: revisar enlaces/rutas y coherencia, sin recompilar la aplicación por rutina.
- Probar el flujo tocado en escritorio y móvil, con barra lateral abierta/cerrada. En pruebas aisladas no desactivar auth: montar los componentes con acciones/consultas simuladas fuera de las rutas reales.
- Editor: probar importación válida e inválida, formato inline, movimiento de bloques, categorías, etiquetas, fuentes, vídeo y zoom. Al pulsar Crear con campos inválidos, comprobar que la checklist identifica los campos, que el resaltado se apaga y que las correcciones actualizan la lista. Guardar borrador admite campos incompletos en noticias nunca publicadas. La prueba visual del panel flotante quedó pendiente porque el navegador integrado no alcanzó el servidor local.
- Gestores: separación noticias/borradores, 15 filas + carga, filtros/orden, selección y operaciones masivas autorizadas. Categorías: confirmar/cancelar nombre y bloquear eliminación asociada.
- Organización/fuentes: persistencia local al reabrir, cambios de estado, idea→plan sin borrado, filtros/favoritas, fechas bisiestas/cambio de año y errores de almacenamiento. Probar cloud con mocks si no está habilitada la migración; no afirmar que se escribió en Supabase real.
- QA previo incluyó TypeScript/build, pruebas de validación/autorización y navegador con fixtures aisladas. Las capturas de demostración contienen ejemplos, no prueban el estado real de la base remota.
- Eliminar entornos temporales de prueba tras detenerlos y verificar su ruta. Dependencias históricas de Vite en `sites-release/node_modules` han servido para QA local; no son parte del despliegue Next ni permiso para publicar Sites.

Pendientes conocidos: probar en vivo la publicación de una noticia `body_format='editorial'` desde el gestor y su renderizado en el portal público (implementado, ver §8.2, pero no verificado visualmente todavía); decidir si las etiquetas del creador deben unificarse con la tabla relacional `tags` (hoy quedan solo dentro del documento y en el portal, `tag_ids` vacío para estas filas, ver §8.2); verificar/aplicar migraciones restantes en Supabase según su estado real; conectar estadísticas a datos reales solo cuando se pida. No anunciar estos puntos como terminados por haber creado UI, acciones o un SQL.

Riesgos y mejoras identificados (revisión del 9 de noviembre de 2026), sin implementar salvo petición:

- **Usuario:** cambiar la contraseña de Supabase expuesta (§6) y decidir si el repositorio debe ser privado.
- **Usuario, al pasar a funcionalidad real:** aplicar las migraciones 3, 6 y 7 (seguras con el estado actual) y decidir las categorías definitivas antes de la 2.
- Los tests usan Supabase simulado; falta comprobar las acciones contra una base aislada con RLS real. Los tests `draft-save` cubren el guardado incompleto, la validación de Crear y la autorización con Supabase simulado. Sin cobertura completa de componentes, rutas ni todas las ramas de `saveNewsDocument`.
- Las imágenes subidas desde la preview del creador quedan públicas en Storage aunque la noticia nunca se guarde (huérfanas).
- Sin `next.config` ni cabeceras de seguridad (CSP, protección contra incrustar el panel en otra web).
- `/api/traffic` y el RPC `record_editorial_view` permiten inflar contadores (impacto bajo mientras el panel de audiencia sea simulado).
- Subida de imágenes duplicada en `article-form.tsx` y `lib/media-upload.ts`. `publicaciones/page.tsx` consulta categorías sin usar el resultado.
- La biblioteca multimedia recorre todo Storage y todas las noticias en cada carga y cada borrado; revisar si crece mucho el archivo.
- Los archivos históricos de Sites se retiraron del índice de Git conservando las copias locales. El historial público anterior no se ha reescrito.

## 13. Herramienta temporal de limpieza para pruebas (retirar al terminar esta fase)

Botón **Limpiar base de datos**, encima de "Ir al portal" en el pie del menú, visible solo en el panel autorizado (`components/reset-editorial-data.tsx` + `app/mesa-editorial-7k4n/reset-actions.ts`). Exige escribir `LIMPIAR`, vuelve a autorizar en servidor y llama a la función atómica `reset_editorial_test_data` (RPC), que en una sola transacción vacía `articles`, `tags`, `categories`, `editorial_plans`, `editorial_ideas`, `editorial_sources` y `editorial_page_views`; conserva Auth, `editorial_admin`, esquema, políticas y las copias locales de agenda/fuentes. Después borra por la API de Storage, en lotes de 100, todos los archivos del bucket `editorial` (comparando el listado con un recuento autorizado antes y después de borrar). Si Storage falla tras vaciar las tablas, el panel avisa que la limpieza quedó parcial y permite reintentar; no omitir ese aviso ni declarar la limpieza completa sin verlo.

Requiere, en este orden, las tres migraciones de la tabla de §6: `202611090004_reset_editorial_test_data.sql` (crea la función), `202611090005_reset_safe_delete.sql` (la corrige: la primera versión fallaba porque Supabase bloquea un `DELETE` sin cláusula `WHERE`) y `202611110001_reset_editorial_storage.sql` (políticas SELECT/DELETE del bucket y la función de recuento autorizado). Si falta alguna, la acción identifica el código de error de Supabase y pide instalarla antes de reintentar, sin dejar datos a medio borrar. `tests/reset-editorial.test.cjs` prueba el orden de las operaciones y los fallos de Storage con dobles, sin credenciales ni escrituras reales.

Aparte existe `supabase/maintenance/vaciar-contenido.sql`, un script manual para SQL Editor que el usuario ejecutó una vez para vaciar el contenido editorial antes de que existiera este botón; no reemplaza el borrado de Storage, que siempre se hace por la interfaz o la API de Supabase, nunca borrando `storage.objects` por SQL.

**Estado al 11 de noviembre de 2026: sin confirmar si las tres migraciones de este botón ya están aplicadas en remoto** (ver estado por archivo en §6); no declarar la limpieza completa ni ejecutar esta herramienta contra Supabase real desde un agente.

**Al terminar la fase de pruebas, retirar:** el botón y `components/reset-editorial-data.tsx`, `app/mesa-editorial-7k4n/reset-actions.ts` y `tests/reset-editorial.test.cjs`.
