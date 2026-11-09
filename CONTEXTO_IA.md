# Contexto del proyecto para asistentes de código

Actualizado: **9 de noviembre de 2026**. Estado consolidado del código, no un historial de propuestas. Es la fuente de verdad común para **Codex** (entra por [AGENTS.md](AGENTS.md)) y **Claude Code** (entra por [CLAUDE.md](CLAUDE.md)).

## 1. Reglas de trabajo

- Carpeta local del usuario: `C:\Users\alejo\Desktop\periodismo-alejodice` (Windows). Repositorio Git con remoto **público** en GitHub: `Alejo-Bengoechea/portal-noticias`, rama principal `main`.
- **No publicar ni actualizar Sites salvo petición explícita del usuario en la tarea actual.** Una autorización antigua no habilita otro despliegue. Hoy los avances se publican en Sites mediante Codex; el dominio propio y su proveedor están sin decidir (ver §6).
- `sites-release/` es una copia histórica de publicación, no la fuente activa; Git la registra como una referencia gitlink histórica, no como el código fuente activo de Next.js; localmente conserva archivos y dependencias propios. Los `alejo-sites-*.tar.gz` de la raíz son compilaciones históricas de Sites (vinext/wrangler), no código fuente. No sincronizarlos, modificarlos ni usarlos como referencia del código actual. Los archivos `*.tar.gz` dejan de versionarse y se conservan localmente, ignorados por Git; las copias antiguas siguen en el historial.
- **Nunca guardar contraseñas, claves ni notas con credenciales en archivos del proyecto**: el repositorio es público y el historial de Git las conserva aunque se borren. No leer/imprimir credenciales de `.env.local` en respuestas, logs o documentación. Consultar `.env.example` para los nombres de variables. No usar una clave service-role en el navegador.
- **Fase actual (noviembre de 2026): validar diseño y flujos.** Todo el contenido, en el portal y en Supabase, es ficticio. La funcionalidad real y la persistencia completa se abordarán después, cuando el usuario lo indique. Priorizar diseño, navegación y flujos; no tratar las migraciones pendientes ni la pérdida de datos de prueba como urgencias.
- No desactivar autenticación, RLS ni comprobaciones del administrador para probar. No crear/publicar/eliminar noticias reales como parte de una prueba visual.
- El usuario tiene poca experiencia en código: implementar lo pedido y explicar en español sencillo. Resolver decisiones rutinarias sin pedir confirmaciones innecesarias.
- Mantener accesibilidad, móvil y diseño existente. Evitar dependencias redundantes. No cambiar funciones de negocio durante una tarea de documentación o diseño.
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
npm.cmd test           # Regresión de acciones de publicación con Supabase simulado
npm.cmd run check      # next typegen + tsc --noEmit
npm.cmd run build      # next build --webpack
npm.cmd start          # Servir una compilación existente
```

`npm.cmd` evita restricciones de `npm.ps1` en PowerShell. En Linux/macOS o en sesiones en la nube se usan los mismos scripts con `npm` (`npm ci`, `npm run check`, `npm run build`). Windows ha bloqueado algunas escrituras de compilación en `.next` con EPERM; resolver el permiso concreto, sin borrar carpetas ni desactivar protecciones.

**Hay tests automáticos** en `tests/*.test.cjs`, ejecutables con `npm.cmd test`, sin credenciales ni escrituras remotas: `publication-status` (acciones de publicación con Supabase simulado, incluidas modificaciones concurrentes) y `validation` (importador JSON `lib/news-import.ts`, `validateWorkspaceValues` y cálculos de calendario). Cargan el TypeScript real con `typescript.transpileModule`; un import nuevo en esos módulos puede requerir ajustar el cargador o los mocks del test. No hay linter ni CI. La validación combina estos tests, `check` (tipos), `build` y pruebas manuales del flujo cuando corresponda. Al 9 de noviembre de 2026, `check` y `build` pasan en un clon limpio con `npm ci` (sin variables de Supabase).

## 3. Estado real de persistencia: leer antes de prometer funciones

| Área | Qué se guarda realmente |
| --- | --- |
| Creador nuevo por JSON/componentes | Previsualización editable. Los botones generales **Crear / Guardar borrador siguen deshabilitados**. No crea filas de noticias en Supabase. |
| Borradores locales del creador | Se guardan desde el aviso al sustituir un trabajo por otro JSON. Persisten solo en ese navegador y se pueden recuperar desde el desplegable y el inicio. No hay autoguardado general. |
| Editor de una noticia ya guardada | `ArticleForm` y `actions.ts` guardan cambios en Supabase. La acción `saveArticle` admite inserción, pero la ruta Nueva noticia muestra el creador nuevo; no existe actualmente un flujo UI completo de alta persistente desde ese creador. |
| Imágenes subidas | Se guardan inmediatamente en Storage, aunque la noticia siga siendo una preview sin guardar. |
| Gestores de noticias/borradores | Por defecto muestran 30 muestras; `datos=reales` consulta Supabase. Las acciones sobre muestras se simulan en memoria. |
| Inicio / Mesa de trabajo | Consultas reales de noticias, combinadas con borradores locales identificados. No cuenta las muestras. |
| Audiencia y tráfico | Cuatro paneles con **datos ficticios explícitos**. La vista no consulta el RPC de tráfico real. En la base remota no existe la tabla de tráfico (migración 3), así que hoy tampoco se registran visitas: `/api/traffic` responde 503 y el portal lo ignora. |
| Organización, ideas y directorio de fuentes | Hoy **modo local** (solo en el navegador): las tablas de la migración 7 no existen en la base remota. Supabase si existen las tablas nuevas. Solo ante tabla ausente, modo local identificado; incluye copia descargable e importación posterior a Supabase. |
| Biblioteca multimedia | Inventario real del bucket `editorial`, sujeto a sus políticas. Sin la migración 6 (no aplicada en remoto) el inventario puede aparecer vacío y el borrado falla. La subida sí funciona (migración 1). |

Los formatos JSON editorial del creador y Tiptap de `articles.body` **no son intercambiables**. Conectar el nuevo creador a persistencia/publicación requiere una decisión de conversión/renderizado y validación de servidor; no basta con habilitar sus botones. El portal actual renderiza el cuerpo persistido con `RichText`.

## 4. Rutas y navegación

Todas las rutas siguientes del panel llevan el prefijo `/mesa-editorial-7k4n`.

| Ruta | Función |
| --- | --- |
| `/` (del panel) | Mesa de trabajo: resumen, borradores recientes, portada y Nueva noticia |
| `/login` | Login privado rediseñado, sin línea horizontal superior |
| `/articulos/nuevo` | Creador por JSON/componentes |
| `/articulos/nuevo?borradorLocal=ID` | Recuperar una copia local concreta |
| `/articulos/nuevo?borradoresLocales=1` | Abrir el desplegable de copias locales |
| `/articulos/[id]` | Editor persistente de una noticia existente |
| `/categorias/nueva` | Crear, renombrar y gestionar categorías |
| `/publicaciones` | Gestor de noticias publicadas/despublicadas |
| `/borradores` | Gestor solo de borradores guardados; sin columnas Estado/Creación |
| `/organizacion` | Agenda editorial y banco de ideas |
| `/fuentes` | Directorio privado de fuentes/contactos |
| `/estadisticas` | Panel visual con estadísticas simuladas |
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
- Inicio: resumen arriba, borradores en columna amplia y portada al lado. No restaurar INICIO/BIENVENIDO con tres cuadrados.
- Las tablas ocupan el 90% del área sin menú; el ancho depende de `.manager-table-scroll`, no de un título opcional. Sin scroll lateral en escritorio; scroll interno de tabla en móvil. Calendarios/tablas no deben ensanchar la página.
- El CSS tiene muchas reglas sucesivas y media/container queries. Revisar especificidad y reglas anteriores antes de añadir otra sobrescritura. Respetar `prefers-reduced-motion`.
- Mantener `autoComplete="off"` en formularios/inputs/textarea/select nuevos. Esto solicita no sugerir historial, no borra el historial antiguo ni controla extensiones.

## 6. Seguridad y configuración externa

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_USER_ID`, `NEXT_PUBLIC_SITE_URL`. No documentar valores reales.

Publicación: hoy en Sites (vía Codex). El dominio propio y su proveedor no están decididos; la sección Vercel del README es una opción, no una decisión. Al elegirlo: configurar `NEXT_PUBLIC_SITE_URL` y la Site URL de Supabase Auth con ese dominio, y valorar cabeceras de seguridad (ver §12).

El 9 de noviembre de 2026 se retiró de la raíz una nota de texto que parecía contener la contraseña de Supabase y que estuvo publicada en el repositorio público. **Esa contraseña debe considerarse comprometida**; cambiarla en el panel de Supabase es una acción del usuario y no consta como hecha. El valor sigue en el historial de Git; no buscarlo ni citarlo.

`lib/supabase.ts`: `adminClient()` comprueba Supabase Auth, coincidencia con `ADMIN_USER_ID` y RPC `is_editorial_admin`. React `cache` solo deduplica comprobaciones dentro de una petición/render; no cachear sesiones globalmente. Cada acción/endpoint de escritura vuelve a autorizar y validar entradas. `proxy.ts` refresca la sesión. Una URL difícil de adivinar no sustituye permisos.

Supabase Auth debe tener registro público deshabilitado y el único administrador configurado. Las tablas y Storage usan RLS. Las fuentes/contactos y notas organizativas no tienen políticas públicas.

### Migraciones, en orden

| Archivo en `supabase/migrations/` | Propósito | Remoto (comprobado 9 nov 2026) |
| --- | --- | --- |
| `202611070001_editorial.sql` | Tablas iniciales, administrador, RLS, bucket editorial | Aplicada |
| `202611070002_sections.sql` | ESPAÑA, INTERNACIONAL, ECONOMÍA | **No.** La base tiene ESPAÑA (`espana`), NACIONAL (`nacional`) y TECNOLOGÍA (`tecnologia`), todas de prueba. No aplicar sin decidir antes las categorías definitivas |
| `202611070003_traffic.sql` | Recogida/resumen de tráfico real | **No** |
| `202611070004_news_management.sql` | Fechas, histórico de publicación y trigger | Aplicada |
| `202611080001_category_required.sql` | Categoría obligatoria salvo borrador; restricción NOT VALID para no alterar histórico | Aplicada |
| `202611090001_media_library.sql` | SELECT/DELETE del inventario Storage, exclusivos del administrador | **No** |
| `202611090002_editorial_workspace.sql` | Agenda, ideas, fuentes, timestamps y RLS privada | **No** |

**Que un archivo exista no demuestra que se haya aplicado.** La columna Remoto procede de una consulta de solo lectura ejecutada por el usuario en SQL Editor el 9 de noviembre de 2026 (comprueba tablas, columnas, restricciones y políticas; el administrador también está configurado). Volver a comprobar tras aplicar cambios. Los agentes no tienen acceso a la base remota. Para validar el histórico de categorías, revisar primero filas antiguas sin categoría y luego validar la restricción.

## 7. Noticias, categorías y operaciones de tabla

`articles`: UUID, slug, título/subtítulo/firma, cuerpo Tiptap, `category_id`, `tag_ids`, portada, destacada y fechas. Estado: `published_at` no nulo → publicado; nulo con `ever_published` → despublicado; nulo sin histórico → borrador. Solo un borrador puede estar sin categoría.

- 15 filas iniciales y otras 15 al llegar al final, mediante IntersectionObserver y acción autenticada.
- Búsqueda por título/ID; orden por categoría, creación y modificación desde cabeceras. Borradores omite Estado/Creación y ordena por modificación por defecto.
- Checkbox de cabecera selecciona filas cargadas. Barra de selección: Eliminar con confirmación en ambos gestores, Publicar/Despublicar solo en noticias. Validación de servidor, máximo 500 IDs únicos. No permitir publicación rápida de borradores ni noticias sin categoría.
- Publicar (en lote o por fila) solo cambia noticias despublicadas; las ya publicadas conservan su `published_at` original y se ignoran en el lote. Despublicar solo cambia las publicadas. No reintroducir actualizaciones que reescriban la fecha de publicación de noticias ya publicadas.
- Menú por fila: publicar o despublicar según estado, editar, cambiar categoría y descargar JSON. Las muestras no son editables como noticias reales.
- Las 30 muestras se reparten diez por cada slug base (`espana`, `internacional`, `economia`). `lib/news-management.ts` resuelve esos slugs contra categorías reales. Las tarjetas de categorías separan conteos reales y de muestra.
- Categorías siempre en mayúsculas. Editar sobre su nombre; Guardar aparece tras un cambio, a la derecha de Eliminar. Cancelar la confirmación restaura el nombre y oculta Guardar. Renombrar conserva slug. Eliminar bloqueado si hay noticias asociadas, incluidas muestras.
- Eliminar una noticia no elimina sus imágenes de Storage.

## 8. Creador por JSON/componentes y borradores locales

Ambos modos usan `NewsComposer`, `NewsPreview` y `InlineNewsEditor`. Editar directamente en el contenido; no volver a montar el editor flotante amarillo ni formularios iniciales externos. Separación visual: datos, portada, cuerpo. Los controles de bloque permiten insertar/ordenar/quitar y deshacer la retirada; movimiento con animación. Inserción arriba/abajo salvo último bloque, que solo la ofrece arriba. No recuperar rótulos de tipo ni divisores de puntos. Ya no se muestra el mensaje para añadir el primer componente.

- Ctrl+B/I/U para negrita/cursiva/subrayado; conservar formato y enlaces. Enter en listas crea un elemento nuevo; Shift+Enter permite salto dentro del elemento.
- Selector propio de categorías en grises, con teclado/Escape/cierre exterior.
- Máximo tres etiquetas, eliminables; duplicadas se marcan en rojo en edición y se rechazan al importar JSON.
- Texto/imagen se intercambia con un pequeño botón central de flechas. En móvil se apila. En lectura, imágenes ampliables con `ZoomableImage` y cierre/Escape/fondo; edición conserva Subir foto/Cambiar URL.
- Vídeo: YouTube validado, `youtube-nocookie.com`; input se oculta tras insertar y Actualizar vídeo aparece sobre el reproductor.
- Fuentes de una noticia al final. Añadir fuente abre de inmediato su formulario y enfoca el nombre; las importadas quedan en lectura hasta Editar. Son distintas del directorio privado `/fuentes`.
- El área grande de JSON se contrae al entrar en modo componentes, pero queda Cargar un JSON en pequeño. Input fuera del bloque oculto/inert.
- Validar un archivo completo antes de cambiar el documento. Si falla, popup breve con ruta/campo y causa, sin perder el trabajo actual. Si es válido y hay cambios, ofrecer Cancelar / Reemplazar / Guardar borrador local y abrir otro JSON.
- Guardado local de noticias: `editorial.local-news-drafts.v1`, vía `lib/local-news-drafts.ts`. Documentos completos con ID/nombre/fecha; conservar copias anteriores. Error de cuota/datos corruptos impide reemplazar el trabajo.
- Desplegable flotante de borradores a la derecha de la barra superior. Restauración solo normaliza: no aplicar validación estricta a un borrador incompleto, que debe poder abrirse para corregirlo. No borrar estas copias al publicar, cambiar de modo o importar por iniciativa propia.
- Fuera de esos guardados locales explícitos, no hay persistencia de la preview al recargar. Los botones generales Crear/Guardar borrador siguen deshabilitados.

### Formato y validación

`lib/news-import.ts` es la referencia: `parseNewsImport` se reexporta como `parseNewsPreview`; `normalizeNewsDocument` convierte una entradilla antigua en párrafo movible/eliminable y completa la fecha de actualización. Conserva una actualización válida, o usa publicación válida/instante de importación; la fecha se muestra salvo opción explícita false.

Raíz editorial: `versionEsquema`, `titular`, `subtitulo`, `metadatos`, `autores`, `fechas`, `portada`, `recursos`, `cuerpo`, `presentacion`. Cada bloque lleva ID único y tipo. Texto enriquecido mediante `spans` con `texto`, `marcas` y `enlace.href`; imágenes por `recursoId`. No aceptar HTML de embed arbitrario.

Paleta actual: `encabezado`, `parrafo`, `lista` (ordenada o viñetas), `cita`, `pullquote`, `imagen`, `texto_imagen`, `video_externo`, `tabla`, `grafico`, `nota_editorial`. Fuentes se añade desde el pie, no desde la paleta. Renderizadores legacy permanecen por compatibilidad (galería, audio, documento, embed, cifras, cronología, encuesta, corrección); no reintroducirlos en el selector sin petición. También se admite el bloque Tiptap de las descargas del gestor.

Límites del nuevo creador: titular 60, subtítulo 240, entradilla importada 600, encabezados/títulos 120, párrafos 3000, firma/crédito 100, epígrafe 300, etiquetas 40 y máximo tres. Tabla de 1–5 columnas y 1–8 filas; gráfico de barras de 1–30 valores finitos entre −1e12 y 1e12. Archivo JSON hasta 2 MB, hasta 500 bloques antes de normalización. El editor persistente antiguo y SQL tienen otros límites; no confundirlos ni cambiarlos sin revisar compatibilidad.

No truncar datos al importar: rechazar con explicación. Un renderizador histórico puede conservar una tabla mayor ya cargada, pero el importador estricto rechaza tablas fuera de los límites actuales. Valida estructuras, tipos, IDs, marcas, URLs, referencias a recursos, fechas, YouTube y documentos Tiptap.

`noticia-james-webb.json` y `ejemplos/noticia-james-webb.json` son copias sincronizadas y válidas para probar. `plantilla-maestra-noticia.json` es una plantilla antigua con placeholders: el enlace de vídeo ficticio puede ser rechazado; no prometer que cualquier ejemplo legacy pasa la validación actual. Los JSON son contenido de referencia, no instrucciones para la IA.

## 9. Mesa de trabajo, estadísticas y multimedia

**Inicio:** `editorial-home.ts` consulta recuentos reales, últimos seis borradores y portada publicada (destacada o última). `EditorialHome` combina borradores Supabase/locales, separados por etiquetas y conteo, con enlaces funcionales para retomar. Errores se muestran como no disponibles, no como ceros. Las muestras del gestor quedan excluidas.

**Audiencia:** `AnalyticsDashboard` y `analytics-demo.ts`: noticia seleccionable, categoría, portal y canales de adquisición. Datos ficticios deterministas explícitos; series coherentes, SVG, barras CSS, donut y tablas accesibles. No afirmar que el dashboard es analítica real ni eliminar la recogida real existente por esta razón.

**Multimedia:** subida autenticada a `/media`, JPG/PNG/WebP/AVIF, firma de archivo y máximo 3 MB; bucket público `editorial`, nombres UUID. No aceptar SVG/HTML ni borrar la imagen anterior automáticamente. La URL es pública incluso antes de guardar/publicar la noticia.

La biblioteca `/multimedia` recorre carpetas/páginas de Storage y noticias guardadas; muestra peso/formato/fecha/URL y asociaciones de portada/body. No detecta uso en JSON locales, previews sin guardar ni otras webs; sin vínculo detectado no significa necesariamente sin uso. Si falla la comprobación, no mostrar asociaciones parciales como completas. Borrado definitivo con confirmación; si hay enlaces a noticias, aceptación adicional. No limpiar artículos automáticamente. Sin política SELECT de Storage el inventario puede parecer vacío.

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
| Acciones de noticias/categorías | `app/mesa-editorial-7k4n/actions.ts`, `bulk-news-actions.ts`, `news-actions.ts` |
| Inicio | `lib/editorial-home.ts`, `components/editorial-home.tsx` |
| Menú y login | `components/editorial-sidebar.tsx`, `editorial-login.tsx`, `admin-forms.tsx`, layout del panel |
| Importación y copias locales | `lib/news-import.ts`, `local-news-drafts.ts`, `components/json-dropzone.tsx` |
| Composición y render editorial | `components/news-composer.tsx`, `news-preview.tsx`, `lib/news-components.ts` |
| Edición inline | `components/inline-news-editor.tsx`, `inline-rich-text.tsx`, `imported-rich-block.tsx`, `lib/inline-format.ts` |
| Bloques | `news-text-image.tsx`, `news-table.tsx`, `news-bar-chart.tsx`, `news-video.tsx`, `news-sources.tsx`, `zoomable-image.tsx` |
| Noticias persistidas | `components/article-form.tsx`, `rich-text.tsx`, ruta `articulos/[id]` |
| Gestores | `news-manager-table.tsx`, `news-row-actions.tsx`, `infinite-news-manager.tsx`, `lib/news-management.ts`, `news-manager-demo.ts` |
| Categorías | `category-manager.tsx`, `category-card.tsx`, `admin-forms.tsx` |
| Multimedia | `lib/media-upload.ts`, `image-signature.ts`, `media-library.ts`, `components/media-library.tsx`, rutas media/multimedia |
| Organización/fuentes | `lib/editorial-workspace.ts`, `editorial-workspace-server.ts`, `components/workspace-common.tsx`, `editorial-planner.tsx`, `source-directory.tsx`, `workspace-actions.ts` |
| Audiencia simulada | `components/analytics-dashboard.tsx`, `lib/analytics-demo.ts` |
| Diseño global | `app/globals.css` y fuentes locales de `public/fonts/` |

`components/preview-text-editor.tsx` y `components/news-component-fields.tsx` no se importan desde ningún sitio; otros formularios antiguos pueden permanecer en disco sin usarse en el flujo actual. Buscar sus imports antes de reutilizarlos; no reactivar el editor flotante ni una paleta retirada por encontrar un archivo existente.

## 12. Verificación y pendientes

- Ejecutar `npm.cmd test`, `npm.cmd run check` y `npm.cmd run build` para cambios de código relevantes. Ajustes solo Markdown: revisar enlaces/rutas y coherencia, sin recompilar la aplicación por rutina.
- Probar el flujo tocado en escritorio y móvil, con barra lateral abierta/cerrada. En pruebas aisladas no desactivar auth: montar los componentes con acciones/consultas simuladas fuera de las rutas reales.
- Editor: JSON válido/inválido, rechazo sin pérdida, formato inline, mover/quitar, entradilla normalizada, categorías, etiquetas, fuentes recién añadidas en edición, vídeo, zoom de lectura y recuperación de copias incompletas.
- Gestores: separación noticias/borradores, 15 filas + carga, filtros/orden, selección y operaciones masivas autorizadas. Categorías: confirmar/cancelar nombre y bloquear eliminación asociada.
- Organización/fuentes: persistencia local al reabrir, cambios de estado, idea→plan sin borrado, filtros/favoritas, fechas bisiestas/cambio de año y errores de almacenamiento. Probar cloud con mocks si no está habilitada la migración; no afirmar que se escribió en Supabase real.
- QA previo incluyó TypeScript/build, pruebas de validación/autorización y navegador con fixtures aisladas. Las capturas de demostración contienen ejemplos, no prueban el estado real de la base remota.
- Eliminar entornos temporales de prueba tras detenerlos y verificar su ruta. Dependencias históricas de Vite en `sites-release/node_modules` han servido para QA local; no son parte del despliegue Next ni permiso para publicar Sites.

Pendientes conocidos: conectar el nuevo creador con persistencia/publicación y formato del portal; verificar/aplicar migraciones en Supabase según su estado real; conectar estadísticas a datos reales solo cuando se pida. No anunciar estos puntos como terminados por haber creado UI, acciones o un SQL.

Riesgos y mejoras identificados (revisión del 9 de noviembre de 2026), sin implementar salvo petición:

- **Usuario:** cambiar la contraseña de Supabase expuesta (§6) y decidir si el repositorio debe ser privado.
- **Usuario, al pasar a funcionalidad real:** aplicar las migraciones 3, 6 y 7 (seguras con el estado actual) y decidir las categorías definitivas antes de la 2.
- El menú del portal (`app/(public)/layout.tsx`) tiene fijas Internacional, España y Economía. Las categorías creadas desde el panel no aparecen en él, y con las categorías remotas actuales Internacional y Economía dan 404. Las 30 muestras del gestor también usan esos tres slugs. Decidir si el menú debe leer las categorías de Supabase.
- Los tests usan Supabase simulado; falta comprobar las acciones contra una base aislada con RLS real. Sin cobertura todavía: componentes de interfaz y rutas.
- Las imágenes subidas desde la preview del creador quedan públicas en Storage aunque la noticia nunca se guarde (huérfanas).
- Sin `next.config` ni cabeceras de seguridad (CSP, protección contra incrustar el panel en otra web).
- `/api/traffic` y el RPC `record_editorial_view` permiten inflar contadores (impacto bajo mientras el panel de audiencia sea simulado).
- Subida de imágenes duplicada en `article-form.tsx` y `lib/media-upload.ts`. `publicaciones/page.tsx` consulta categorías sin usar el resultado.
- La biblioteca multimedia recorre todo Storage y todas las noticias en cada carga y cada borrado; revisar si crece mucho el archivo.
- Los archivos históricos de Sites se retiraron del índice de Git conservando las copias locales. El historial público anterior no se ha reescrito.
