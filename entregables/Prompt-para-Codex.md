# Prompt para Codex: correcciones de la auditoría y base de la analítica de Instagram

Copia todo este archivo en un chat nuevo de Codex. Es autónomo: no necesita el PDF de la auditoría, aunque procede de él (`entregables/Auditoria-y-plan-de-analitica-Instagram.pdf`).

## 1. Contexto

- Repositorio local: `C:\Users\alejo\Desktop\periodismo-alejodice` (remoto público `Alejo-Bengoechea/portal-noticias`, rama `main`).
- Revisión auditada: `main` en el commit `23d1068` («Integra estadísticas de Instagram en la mesa editorial»), con `63eabd6` como punto de partida anterior, **más** los cambios locales sin commit que había el 13 de noviembre de 2026 en estos ocho archivos: `CONTEXTO_IA.md`, `app/globals.css`, `app/mesa-editorial-7k4n/layout.tsx`, `components/editorial-home.tsx`, `components/editorial-sidebar.tsx`, `lib/articles.ts`, `lib/editorial-home.ts`, `tests/real-data-only.test.cjs`. Los números de línea de este prompt corresponden a ese estado; si el árbol ha cambiado, localiza el código por su contenido.
- Estado de las comprobaciones en esa revisión: `npm.cmd test` 72 pruebas correctas, `npm.cmd run check` correcto, `npm.cmd run build` correcto.
- La auditoría fue de solo lectura. Nadie ha llamado a Meta con la cuenta real: todo lo marcado como «pendiente de Meta» sigue sin comprobar.

## 2. Reglas de trabajo

1. Lee `AGENTS.md` y `CONTEXTO_IA.md` (protocolo §1.1) antes de empezar, y la guía pertinente de `node_modules/next/dist/docs/` antes de tocar código de Next.js.
2. Empieza con `git status` y `git log --oneline -10`. Hay cambios ajenos sin commit: no los reviertas ni los reformatees. Si un arreglo toca uno de esos archivos, trabaja sobre su contenido actual.
3. No leas ni muestres `.env.local`, tokens ni secretos. Los nombres de variables están en `.env.example`.
4. No publiques Sites ni hagas `git push` salvo que el usuario lo pida en esta tarea. No apliques migraciones ni escribas en Supabase real. No llames a Meta con el token real sin autorización expresa del usuario para esa prueba.
5. No desactives autenticación ni RLS para probar. Las pruebas usan Meta y Supabase simulados, como `tests/instagram.test.cjs`.
6. Cambios localizados, sin dependencias nuevas. Mensajes de commit en español. Si cambia el comportamiento real, actualiza `CONTEXTO_IA.md` en el mismo commit, reemplazando lo obsoleto.
7. Explica al usuario cada cambio en español sencillo.

## 3. Bloque A: correcciones que puedes implementar ya

Están ordenadas por prioridad. Cada una indica el problema confirmado, los archivos, la corrección y el criterio de aceptación.

### A1. Estado por bloque: distinguir «sin datos», «falló», «no admitido» e «insuficiente» (P1)

- **Problema confirmado en simulación.** `lib/instagram.ts:168` solo informa del error de la consulta de totales. Si fallan la serie diaria o los desgloses (por ejemplo, por límite de Meta), la página muestra «Sin datos disponibles» sin aviso. En `lib/instagram.ts:141-145`, el reintento métrica a métrica devuelve `ok: true` con datos parciales cuando un límite corta la serie de reintentos. En `page.tsx:120`, Audiencia solo avisa si las cuatro consultas fallan por permiso; con límite, red o token no dice nada. En `page.tsx:71`, las métricas que Meta no devuelve desaparecen de la lista sin rastro.
- **Corrección.** Haz que `overview`, `audience` y `mediaInsights` devuelvan, por cada bloque (totales, serie, cada desglose, cada dimensión demográfica), un estado explícito: `ok`, `empty` (Meta respondió sin filas), `error` (con motivo `network | token | permission | limit`), `unsupported` (código 100 para esa métrica) o `insufficient` (umbral de privacidad). Conserva la lista de métricas pedidas y no devueltas. En la página, cada panel muestra su propio aviso; «Sin datos disponibles» queda solo para `empty`.
- **Aceptación.** Con Meta simulado: si la serie y los desgloses devuelven código 4 y los totales funcionan, el resumen muestra los totales y un aviso de límite en cada panel afectado. Si el reintento individual se corta por límite en la tercera métrica, el resultado se marca como parcial y la página lo dice. En Audiencia, cuatro respuestas con código 4 muestran el mensaje de límite. Una métrica pedida y no devuelta aparece con guion y la nota «Meta no devolvió este dato».

### A2. Etiquetas de «Seguimientos y bajas» y resto de desgloses (P1)

- **Problema confirmado en simulación y en la referencia de Meta.** El desglose `follow_type` devuelve `FOLLOWER`, `NON_FOLLOWER` y `UNKNOWN`. `page.tsx:23-24` los traduce como «Seguidores» y «No seguidores», así que el panel «Seguimientos y bajas» (`page.tsx:96`) enseña esas dos palabras en lugar de altas y bajas. Las claves `FOLLOW` y `UNFOLLOW` del mapa no figuran en la documentación. El desglose `media_product_type` de la cuenta devuelve `POST`, `REEL`, `CAROUSEL_CONTAINER`, `STORY` y `AD`, y la página solo traduce `FEED`, `REELS` y `STORY`: el resto sale en crudo. La navegación de historias solo se traduce si llega en minúsculas. Género (`F`, `M`, `U`) y países (código ISO) salen sin traducir.
- **Corrección.** Sustituye el mapa global por mapas por contexto (métrica + desglose). Normaliza las claves a mayúsculas antes de buscar. Para `follows_and_unfollows`, rotula `FOLLOWER` como «Nuevos seguidores», `NON_FOLLOWER` como «Bajas» y `UNKNOWN` como «Sin clasificar», y añade el saldo neto. Deja esa interpretación marcada en el código como pendiente de confirmar (ver B2). Añade `POST` «Publicaciones», `REEL` y `REELS` «Reels», `CAROUSEL_CONTAINER` «Carruseles», `AD` «Anuncios», `STORY` «Historias», `UNKNOWN` «Sin clasificar». Traduce género y usa `Intl.DisplayNames('es', { type: 'region' })` para países. Una clave desconocida se muestra tal cual con la marca «(sin traducir)».
- **Aceptación.** Prueba de render con Meta simulado: «Seguimientos y bajas» muestra «Nuevos seguidores 31», «Bajas 12» y el neto; «Alcance por formato» no muestra ninguna clave en inglés; la navegación de historias se traduce igual con `tap_forward` y con `TAP_FORWARD`.

### A3. Retirar métricas que Meta ya no ofrece (P1)

- **Problema confirmado en la documentación y en simulación.** `profile_views` de cuenta (`lib/instagram.ts:87`) se retiró para todas las versiones el 8 de enero de 2025. Al pedirla, la consulta agrupada falla y el código repite las 12 métricas una a una: el resumen hace 18 peticiones en lugar de 7 en cada carga, y «Visitas al perfil» no aparece nunca. `reached_audience_demographics` (pestaña «Cuentas alcanzadas», `lib/instagram.ts:173-176` y `page.tsx:106`) ya no figura en la referencia de v27: la pestaña mostrará siempre «Sin datos disponibles».
- **Corrección.** Quita `profile_views` de `totals` y su etiqueta de cuenta. Quita el grupo `reached_audience` de Audiencia o déjalo visible pero deshabilitado con el texto «Meta ya no ofrece este desglose». Mantén `profile_visits` de pieza, que sí existe.
- **Aceptación.** En simulación, el resumen hace una sola petición de totales cuando todas las métricas son válidas. Ninguna consulta pide `profile_views` ni `reached_audience_demographics`.

### A4. Historias con pocos espectadores y otros errores mal clasificados (P1)

- **Problema confirmado en simulación.** Meta responde con el código 10 («no hay suficientes espectadores») cuando una métrica de historia vale menos de 5. `classify` (`lib/instagram.ts:27`) lo trata como permiso y la página muestra «Meta denegó el acceso. Revisa los permisos…». El código 80002 (límite de uso de Instagram) no está en la lista de `lib/instagram.ts:26` y, con HTTP 400, acaba como «Meta no devolvió datos».
- **Corrección.** En `mediaInsights` de historias, convierte el código 10 en el estado `insufficient` con el texto «Esta historia todavía no tiene espectadores suficientes: Meta exige al menos 5». Añade los códigos 80000 a 80014 a `limit`. Lee la cabecera `X-Business-Use-Case-Usage` y, si trae `estimated_time_to_regain_access`, muestra los minutos de espera.
- **Aceptación.** Pruebas nuevas: historia con código 10 muestra el mensaje de espectadores, no el de permisos; código 80002 con HTTP 400 se clasifica como `limit`.

### A5. Fechas, zona horaria y hora de consulta (P1)

- **Problema confirmado en simulación.** La ventana se calcula con la medianoche UTC (`lib/instagram.ts:149-150`) y se rotula «UTC» (`page.tsx:82`); el resto del panel usa Europe/Madrid. A las 00:30 de Madrid del día 13, el resumen termina el día 11. Las fechas de publicaciones e historias se formatean en UTC (`page.tsx:12` y `page.tsx:178`): una pieza publicada a las 00:30 de Madrid aparece con la fecha del día anterior. La serie diaria se etiqueta con `end_time`, que es el cierre del día de Meta.
- **Corrección.** Formatea todas las fechas visibles en Europe/Madrid. Añade en la cabecera de la vista «Consultado el … a las …» con la hora de Madrid. En el rótulo del periodo escribe el intervalo real y la nota «Meta agrega por días con su propio huso; los dos últimos días pueden estar incompletos (retraso de hasta 48 horas)». No cambies todavía el cálculo de `since` y `until` ni el día al que se asigna cada barra: dependen de B3.
- **Aceptación.** Prueba de render: una pieza con `timestamp` `2026-11-12T23:30:00+0000` se muestra como 13 nov. La vista muestra la hora de consulta.

### A6. Ceros que no son ceros (P1)

- **Problema confirmado en la documentación y en simulación.** Meta devuelve 0 en `replies` para historias creadas desde Europa, y la cuenta es española: «Respuestas 0» es un dato ausente. Además Meta devuelve un conjunto vacío, no 0, cuando no tiene dato.
- **Corrección.** Para `replies` de historia y de cuenta, muestra guion con la nota «No disponible para cuentas de Europa» en lugar de 0. Mantén la distinción actual entre `0` y `null` para las demás métricas y añade a la leyenda «Un guion indica que Meta no devolvió ese dato; 0 es un cero real».
- **Aceptación.** Prueba de render: una historia con `replies: 0` muestra guion y la nota.

### A7. Menú lateral: iconos ocultos, entrada activa y parpadeo en móvil (P1 y P2)

- **Problema confirmado en maqueta con el CSS compilado.** En el menú contraído, el pie tiene `visibility:hidden` (`app/globals.css:125`) y sigue ocupando sitio, y la lista de iconos oculta su barra de desplazamiento (`app/globals.css:126`). A 375×812 quedan fuera de la vista «Redes Sociales» y «Multimedia»; a 1366×768, «Multimedia» (medido sin el botón de limpieza; con él cabe aún menos). En móvil el menú empieza contraído, así que el acceso a Redes Sociales no se ve.
- **Problema confirmado en código.** `components/editorial-sidebar.tsx:21` marca la entrada activa solo con coincidencia exacta: en `/redes-sociales/instagram` no se resalta ninguna. `components/editorial-sidebar.tsx:16` arranca con el menú abierto y lo contrae tras hidratar: en móvil se ve el panel abierto un instante en cada carga completa.
- **Corrección.** En contraído, saca el pie del flujo (`display:none` o equivalente que no rompa el diseño de §5 de `CONTEXTO_IA.md`) para que la lista ocupe toda la altura. Marca activa la entrada cuya ruta sea prefijo de la actual (con la raíz del panel como coincidencia exacta). Haz que el estado inicial en móvil lo decida el CSS antes de hidratar, sin estado abierto por defecto. Cambia el icono «↗» de Redes Sociales por uno que no coincida con «Ir al portal» ni con los enlaces externos.
- **Aceptación.** A 375×812 y a 1366×768, con el menú contraído, todos los iconos son visibles o alcanzables con desplazamiento evidente. En `/redes-sociales/instagram` la entrada «Redes Sociales» tiene `aria-current="page"`. En móvil no aparece el panel abierto al cargar.

### A8. Límites, reintentos y caché corta (P2)

- **Problema confirmado en simulación.** No hay reintentos (un HTTP 500 pasajero se muestra como fallo de red al primer intento), ni caché: cada carga repite el descubrimiento de cuenta y el perfil, y cada clic en «Ver métricas» vuelve a pedir la lista. Un Reel no compartido en Facebook hace 12 peticiones porque `crossposted_views` y `facebook_views` tumban la consulta agrupada.
- **Corrección.** Un único reintento con espera breve solo para errores de red y 5xx. Caché en memoria del servidor de 5 minutos para el identificador de cuenta y de 1 a 5 minutos para las lecturas, con un botón «Actualizar» que la invalide; no guardes el token en la caché ni en claves. Pide `crossposted_views`, `facebook_views` y `link_clicks` en una llamada aparte y tolerante. Recuerda durante la vida del proceso qué métricas devolvieron código 100 por formato para no repetirlas.
- **Aceptación.** En simulación: dos cargas seguidas del resumen hacen una sola tanda de peticiones; un Reel no compartido hace como máximo 3 peticiones de métricas; un 500 seguido de 200 se resuelve sin mostrar error.

### A9. Textos que explican cada cifra (P2)

- **Problema confirmado en código y documentación.** La vista no dice que el alcance es una estimación de cuentas únicas y no se puede sumar entre días ni entre formatos, que `this_month` son los últimos 30 días y no el mes natural (`page.tsx:116`), que la demografía solo trae los 45 valores principales, que las interacciones de cuenta incluyen contenido promocionado, ni que «Me gusta» de la lista excluye los de publicaciones promocionadas. «Tasa de abandono (%)» describe mal `reels_skip_rate`. `page.tsx:180` escribe «1 comentarios».
- **Corrección.** Añade una nota breve por panel con esas aclaraciones. Renombra a «Saltos en los 3 primeros segundos». Cambia «Desglose del mes actual» por «Últimos 30 días». Corrige el plural. Muestra las duraciones largas en horas, minutos y segundos.
- **Aceptación.** Revisión de textos en la prueba de render.

### A10. Inicio, [REC] y documentación (P2 y P3)

- `components/editorial-home.tsx:27-30`: la página de inicio se quedó sin `<h1>` en `63eabd6`. Añade uno, visible o con la clase `sr-only`.
- `app/globals.css:495`: el [REC] pasó a `position: fixed` y en móvil se superpone al texto al desplazar la página (medido: 64×30 px en la esquina, con texto por debajo). El SVG en línea perdió la fuente monoespaciada del antiguo `public/rec.svg` y ahora usa Inter. **No lo cambies sin la decisión C1.** `public/rec.svg` ya no se usa.
- `CONTEXTO_IA.md`: dice 65 pruebas y hay 72. Documenta el tipo de token esperado (token de usuario del sistema de integración empresarial, permisos `instagram_basic` e `instagram_manage_insights`), el indicador [REC] y las excepciones de tipografía.
- Amplía `tests/instagram.test.cjs` con los casos de A1 a A8 y añade una prueba de render de la página. La página es un componente asíncrono de servidor: resuelve el árbol llamando a cada función componente con `await` antes de `renderToStaticMarkup`, con `next/link`, `next/navigation`, `@/lib/supabase` y los módulos CSS simulados.

## 4. Bloque B: pendiente de una prueba real con Meta

No lo implementes a ciegas. Prepara un guion de comprobación de solo lectura y pide al usuario autorización expresa para ejecutarlo con el token real. No guardes las respuestas en el repositorio.

| Id | Qué comprobar | Para qué |
| --- | --- | --- |
| B1 | Que el token es un token de usuario del sistema de integración, si caduca y cuándo, y que incluye `instagram_manage_insights` (no viene en la configuración por defecto). | Avisar antes de la caducidad. |
| B2 | En `follows_and_unfollows` con `follow_type`, qué significan `FOLLOWER` y `NON_FOLLOWER`: compáralo con «Seguidores» de la app. | Confirmar las etiquetas de A2. |
| B3 | El valor real de `end_time` en la serie diaria y a qué día corresponde cada barra; compáralo con un día concreto de la app. | Decidir el huso y el día de cada barra. |
| B4 | El código de error exacto al pedir `profile_views` y `reached_audience_demographics`. | Cerrar A3. |
| B5 | Unidad de `ig_reels_avg_watch_time` e `ig_reels_video_view_total_time` (¿milisegundos?) y escala de `reels_skip_rate` (¿0 a 1 o 0 a 100?), frente a la app. | Mostrar bien las cifras de Reels. |
| B6 | Si `link_clicks`, `reposts` y `facebook_views` de historia funcionan con el inicio unificado. | Ajustar la lista de métricas. |
| B7 | Si `follower_count` y `online_followers` siguen respondiendo. | Saber si hay horas de actividad de la audiencia. |
| B8 | El intervalo máximo de `since` y `until` y hasta cuántos días atrás responde la cuenta. | Dimensionar la carga inicial del histórico. |
| B9 | Si el webhook `story_insights` llega con el inicio unificado y qué campos trae. | Decidir si sustituye a la captura horaria. |
| B10 | Valores de `follower_type` en `views` y de género y edad en demografía. | Completar las traducciones. |

## 5. Bloque C: decisiones del usuario

- **C1. [REC].** ¿Debe acompañar al desplazamiento (fijo, con margen y fondo para no tapar el texto) o quedarse en la cabecera como antes? ¿Fuente monoespaciada o Inter?
- **C2. Datos de ejemplo de X, YouTube y TikTok.** `components/social-dashboard.tsx:8-12` muestra cifras inventadas con una sola etiqueta «Datos de ejemplo». ¿Se retiran y se deja «Sin conectar», o se mantienen con una marca visible en cada tarjeta y la etiqueta «Datos reales de Meta» en Instagram?
- **C3. Tipografía.** Tras `63eabd6`, el antetítulo y la fecha usan monoespaciada dentro de la noticia e Inter en las tarjetas de portada; los títulos de sección, de categoría y de búsqueda y las páginas legales pasan a Inter. La monoespaciada depende de fuentes de Windows y en el móvil cambia de aspecto. ¿Es lo deseado? ¿Se añade una fuente monoespaciada web?
- **C4. «Novedades del día».** ¿Se mantiene la tabla vacía o se oculta hasta que exista el proceso que la alimente?
- **C5. Dónde se ejecuta la captura periódica** (sección 6): función programada de Supabase, tarea programada del alojamiento definitivo o GitHub Actions. Depende del dominio y el proveedor, aún sin decidir.
- **C6. Con qué credencial escribe la captura en Supabase** sin sesión de administrador: clave de servicio guardada solo en el servidor o una función RPC con secreto propio.
- **C7. Taxonomía de etiquetas editoriales:** lista inicial de temas, series, tipos de gancho y llamadas a la acción.
- **C8. Nombre de usuario fijo.** `lib/instagram.ts:4` exige `alejobengo`. Si cambia el nombre de la cuenta, la vista falla aunque el identificador sea correcto. ¿Se pasa a variable de entorno?

## 6. Fase siguiente: captura de histórico (no empezar sin C5 y C6)

Objetivo: guardar lo que Meta borra. Las métricas de historias desaparecen a las 24 horas, las de cuenta a los 90 días, y las de cada pieza solo existen como total acumulado.

Diseño acordado en la auditoría, para implementar cuando el usuario lo pida:

1. Migración nueva en `supabase/migrations/` con tablas privadas (RLS solo administrador, como `editorial_plans`):
   - `ig_metric_definitions`: clave, nivel, nombre en la API, unidad, tipo de agregación (`suma`, `únicos`, `foto`, `tasa`, `media`), si es sumable, descripción y vigencia.
   - `ig_capture_runs`: inicio, fin, origen (`cron`, `manual`, `webhook`), versión de la API, llamadas hechas, errores y cabecera de uso.
   - `ig_account_snapshots`: foto diaria de `followers_count`, `follows_count` y `media_count`.
   - `ig_account_daily_metrics`: métrica, día de Meta (`end_time`), desglose, valor, estado, versión de la API, primera y última captura. Clave única por cuenta, métrica, día y desglose.
   - `ig_media`: ficha de cada pieza (identificador, formato, enlace, texto, fecha, primera y última vez vista, fecha de borrado).
   - `ig_media_snapshots`: pieza, instante de captura, antigüedad en horas, métrica, desglose, valor, estado y versión.
   - `ig_audience_snapshots`: foto semanal de demografía por grupo y dimensión.
   - `ig_media_tags`: etiquetas editoriales del usuario, en tabla aparte que la captura nunca sobrescribe.
2. Tarea de captura idempotente (inserción con `upsert` sobre las claves únicas):
   - **Cada hora:** historias activas con todas sus métricas y la navegación. Es lo primero que hay que poner en marcha.
   - **Cada día:** foto de la cuenta; métricas diarias de los tres últimos días (por el retraso de 48 horas); piezas publicadas en los últimos 28 días.
   - **A edades fijas de cada pieza:** 1, 3, 6, 12, 24, 48 y 72 horas, 7, 14 y 28 días, y después una vez al mes.
   - **Cada semana:** demografía.
   - **Una sola vez:** carga inicial de los 90 días de cuenta disponibles y una foto de todo el catálogo.
3. Respeta los límites: lee `X-Business-Use-Case-Usage`, detente si el uso supera el 80 % y no reintentes ante 80002.
4. Guarda siempre el estado (`ok`, `empty`, `unsupported`, `insufficient`, `error`) además del valor: un hueco no es un cero.
5. Pruebas con Meta y Supabase simulados: idempotencia, recaptura de los tres últimos días, historia con menos de 5 espectadores, corte por límite.

## 7. Verificación y entrega

- Ejecuta `npm.cmd test`, `npm.cmd run check` y `npm.cmd run build` y pega el resumen.
- Comprueba el menú y la vista de Instagram a 375×812 y a 1366×768, con el menú abierto y contraído, montando los componentes con datos simulados fuera de las rutas reales.
- Indica qué comprobaste y qué no. No declares terminado nada del bloque B sin la prueba real.
- Commits por alcance (Instagram, menú, inicio, documentación), en español, sin incluir cambios ajenos. Sin `git push` y sin publicar Sites salvo petición expresa.
