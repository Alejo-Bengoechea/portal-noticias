from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/Guia-del-proyecto-e-Instagram.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, font in [('Text','segoeui.ttf'),('Bold','segoeuib.ttf'),('Light','segoeuil.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/'+font))
pdfmetrics.registerFontFamily('Text', normal='Text', bold='Bold', italic='Text', boldItalic='Bold')
W,H=595.28,841.89
INK=HexColor('#22272b'); MUTED=HexColor('#5e676d'); ACC=HexColor('#a92d43'); PALE=HexColor('#f5f3f0'); LINE=HexColor('#dedbd6')
c=canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle('Tu plataforma editorial e Instagram | Guía sencilla')
c.setAuthor('Alejo Bengoechea')
styles={
 'body':ParagraphStyle('body',fontName='Text',fontSize=11,leading=16,textColor=INK,spaceAfter=0),
 'small':ParagraphStyle('small',fontName='Text',fontSize=8.8,leading=12.5,textColor=MUTED),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=13.5,leading=18,textColor=INK),
 'box':ParagraphStyle('box',fontName='Text',fontSize=10.5,leading=15,textColor=INK),
}
y=0
def p(text, style='body', x=48, width=499, gap=10):
    global y
    a=Paragraph(text,styles[style]); _,height=a.wrap(width,1000)
    if y-height < 65: raise ValueError(f'Page {c.getPageNumber()} overflow at {text[:60]} y={y} h={height}')
    a.drawOn(c,x,y-height); y-=height+gap
def h(text):
    global y
    y-=5;p(text,'h2',gap=7)
def box(text):
    global y
    a=Paragraph(text,styles['box']);_,height=a.wrap(467,1000)
    c.setFillColor(PALE);c.roundRect(48,y-height-26,499,height+26,9,fill=1,stroke=0)
    c.setFillColor(ACC);c.roundRect(48,y-height-26,3,height+26,1.5,fill=1,stroke=0)
    a.drawOn(c,64,y-height-13);y-=height+42
def sources(items):
    global y
    y-=6
    p('FUENTES PARA ESTA PÁGINA','small',gap=5)
    for label,url in items:p(f'<link href="{url}" color="#a92d43">{label} ↗</link>','small',gap=3)
def page(part,title,sub=None):
    global y
    if c.getPageNumber()>1: pass
    c.setFillColor(ACC);c.rect(48,H-43,27,3,fill=1,stroke=0)
    c.setFont('Bold',8.5);c.drawString(85,H-44,part.upper())
    c.setFillColor(INK);c.setFont('Light',28);c.drawString(48,H-94,title)
    y=H-115
    if sub:p(sub,'small',gap=19)
def end():
    c.setStrokeColor(LINE);c.line(48,46,W-48,46)
    c.setFont('Text',8);c.setFillColor(MUTED);c.drawString(48,31,'ALEJO BENGOECHEA  ·  Guía sencilla  ·  13 noviembre 2026')
    c.drawRightString(W-48,31,str(c.getPageNumber()));c.showPage()
def node(x,y0,w,hh,title,desc):
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(x,y0,w,hh,8,fill=1,stroke=1)
    a=Paragraph('<b>'+title+'</b><br/>'+desc,styles['box']);_,ah=a.wrap(w-24,hh);a.drawOn(c,x+12,y0+(hh-ah)/2)
def arrow(x1,y1,x2,y2):
    import math
    c.setStrokeColor(ACC);c.setFillColor(ACC);c.setLineWidth(1.2);c.line(x1,y1,x2,y2)
    a=math.atan2(y2-y1,x2-x1);path=c.beginPath();path.moveTo(x2,y2)
    path.lineTo(x2-6*math.cos(a-.45),y2-6*math.sin(a-.45));path.lineTo(x2-6*math.cos(a+.45),y2-6*math.sin(a+.45));path.close();c.drawPath(path,fill=1,stroke=0)

S={
 'account':'https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights',
 'media':'https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights',
 'guide':'https://developers.facebook.com/documentation/instagram-platform/insights',
 'login':'https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login',
 'meta':'https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-56730cef-8d38-4f1a-8cc3-54444b625e7c',
 'messages':'https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-fc851f39-7194-4522-a475-2cea8de46d16',
 'ads':'https://developers.facebook.com/docs/marketing-api/insights/v9.0/',
}

page('Parte 1 · El proyecto','Cómo está construida tu web','Un mapa de lo que ya tienes y de las posibilidades de Instagram. Sin entrar en código.')
p('Tu proyecto reúne <b>un periódico digital abierto al público</b> y <b>una mesa editorial privada</b> desde la que trabajas. Comparten las noticias, las imágenes y las reglas de publicación.')
node(48,550,236,79,'Lectores · Portal público','Leen noticias, buscan y navegan por categorías.')
node(311,550,236,79,'Tú · Área editorial','Creas, organizas y publicas. Acceso con tu cuenta.')
arrow(166,550,225,517);arrow(429,550,370,517)
node(123,438,350,79,'Una aplicación común','Next.js coordina las pantallas, el guardado y los permisos.')
arrow(227,438,168,402);arrow(372,438,430,402)
node(48,300,236,102,'Supabase · Tu archivo','Noticias y categorías<br/>Acceso del administrador<br/>Almacenamiento de imágenes')
node(311,300,236,102,'Servicios externos','Instagram aporta estadísticas.<br/>YouTube reproduce los videos insertados en noticias.')
y=274
h('Dónde queda cada cosa')
p('Los textos y la organización de las noticias se guardan en la base de datos de Supabase. Las fotos que subes van a su almacén de archivos. Un video de YouTube sigue alojado en YouTube, aunque se vea dentro de tu web.')
p('React construye las pantallas y Tailwind ayuda a darles estilo. Son piezas del mismo proyecto. Para entenderlo y usarlo no necesitas conocer sus detalles técnicos.')
box('La edición está protegida por tu inicio de sesión y por permisos del servidor y la base de datos. La dirección privada del panel es solo una parte de la navegación.')
end()

page('Parte 1 · Módulos','Qué puedes hacer hoy','Estado según el código y la documentación local. No se ha probado la conexión real a tus cuentas para preparar este PDF.')
for title,text in [
 ('Portal de noticias','Portada, noticias, categorías, buscador y páginas de derechos y privacidad. Los lectores ven el contenido publicado.'),
 ('Creación y gestión editorial','Puedes empezar con componentes o cargar un JSON, revisar la misma vista previa, corregir contenido y guardar. Hay gestores separados de noticias y borradores, además de categorías.'),
 ('Biblioteca multimedia','Reúne las imágenes subidas, su tamaño y las relaciones que el sistema detecta con noticias. El inventario y el borrado dependen de los permisos configurados en Supabase.'),
 ('Inicio y organización','El inicio recupera trabajo guardado. Agenda, ideas y directorio de fuentes ayudan a planificar. La documentación indica que estos últimos funcionan en modo local del navegador hasta completar sus tablas en Supabase.'),
 ('Audiencia y redes sociales','Audiencia y tráfico muestra datos de ejemplo. Instagram tiene una conexión programada a Meta. Las otras redes tienen ejemplos. Las sugerencias del día en el inicio todavía son un espacio preparado para desarrollar.')]:
    h(title);p(text)
box('<b>El recorrido de una noticia</b><br/>Escribir → Guardar borrador → Completar y crear → Publicar desde el gestor → Aparecer en el portal.<br/>Crear una noticia no la publica automáticamente.')
p('La web se trabaja en local. Su alojamiento definitivo y el dominio siguen pendientes de decisión. Publicar una versión en internet es un paso separado.','small')
end()

page('Parte 2 · Instagram','Tu punto de partida','Ya hay una base construida. La siguiente mejora importante sería conservar tus datos en el tiempo.')
h('Lo que ya está programado')
p('En Redes sociales → Instagram hay una vista para <b>@alejobengo</b>. Consulta a Meta, la empresa de Instagram, y presenta un resumen de 7 o 28 días, publicaciones, reels, historias activas y datos agrupados de audiencia del mes.')
p('Puedes pedir una actualización y consultar el detalle de una publicación. El sistema intenta distinguir entre un dato real, uno no disponible y un problema de conexión o permisos. Lo que aparezca depende de lo que Meta entregue para tu cuenta.')
h('Lo que todavía falta')
p('Hoy esa consulta no crea un archivo histórico propio. Tampoco están incorporados el análisis de comentarios y mensajes, las campañas pagadas ni informes automáticos. Los rankings del contenido consultado no deben interpretarse como un ranking de toda tu historia.')
box('<b>Consultar</b> sería mirar hoy el contador de una publicación.<br/><b>Guardar un historial</b> sería anotar ese contador cada día para ver cómo crece. La segunda opción es la que nos permitirá analizar de verdad su evolución.')
h('Qué necesitas para conectarlo')
p('La vía oficial trabaja con una cuenta profesional de <b>creador o empresa</b>. Tú autorizas qué información puede consultar tu plataforma. La conexión se hace mediante una API, que es una puerta oficial para que dos aplicaciones compartan datos.')
p('El proyecto utiliza el inicio unificado de Meta. También existen conexiones mediante Instagram Login y Facebook Login. Instagram Login no exige vincular una página de Facebook. Cada vía tiene permisos y capacidades distintos, así que conviene conservar y verificar primero la conexión actual.')
p('Para tu propia cuenta puede bastar el acceso estándar configurado por el desarrollador. Conectar cuentas de otras personas suele requerir permisos y revisión adicionales. Tú no necesitas programarlo, pero sí autorizar el acceso.')
sources([('Meta · Requisitos de estadísticas y niveles de acceso',S['guide']),('Meta · Conexión mediante Instagram',S['login'])])
end()

page('Parte 2 · Datos disponibles','Qué podrías medir','La disponibilidad depende de la cuenta, el formato, los permisos y la versión de la conexión.')
h('1. La cuenta y su audiencia')
p('Seguidores y cambios de seguidores, alcance, visualizaciones, interacciones y acciones en el perfil, cuando estén disponibles. La audiencia puede agruparse por edad, género, ciudad y país. Algunas métricas requieren un mínimo de seguidores y los grupos no representan necesariamente a toda tu audiencia.')
p('<b>Para ti</b>, serviría para entender en qué lugares creces y qué contenidos acercan tu perfil a más personas. Las horas de actividad, si están disponibles, aportarían una pista para probar horarios.')
h('2. Fotos, carruseles y reels')
p('Se pueden consultar alcance, visualizaciones, me gusta, comentarios, guardados y compartidos según el formato. En reels existen medidas de tiempo de reproducción y otras señales de consumo. Un carrusel se analiza como publicación, sin dar por hecho estadísticas independientes para cada fotografía.')
p('<b>Para ti</b>, permitiría comparar retratos, editoriales de moda, videos de sesiones o contenido periodístico. Conviene etiquetar cada pieza por tema y objetivo para que la comparación tenga sentido.')
h('3. Historias')
p('Pueden aportar visualizaciones, alcance y navegación entre historias. Los clics y las respuestas tienen limitaciones. En Europa, las respuestas de historias no ofrecen un recuento completo mediante esta conexión. La ventana de consulta de estadísticas de historias es muy corta, por lo que habría que capturarlas automáticamente.')
box('<b>Dos palabras que conviene separar</b><br/>Alcance cuenta las cuentas distintas alcanzadas. Visualizaciones cuenta las veces que se muestra o reproduce el contenido. Una misma persona puede verlo varias veces.')
p('Meta puede tardar hasta 48 horas en completar algunos datos. Ver pocos resultados justo después de publicar no permite concluir todavía que una pieza funcionó mal.','small')
sources([('Meta · Estadísticas de cuenta',S['account']),('Meta · Estadísticas por publicación y sus límites',S['media'])])
end()

page('Parte 2 · Más posibilidades','Más allá de los contadores','Estas ampliaciones todavía tendrían que desarrollarse en tu plataforma.')
h('Comentarios y conversaciones')
p('Con permisos adicionales, podrías recoger comentarios de tus publicaciones y sus respuestas. Mi propuesta sería agrupar preguntas frecuentes, detectar temas que interesan y marcar posibles contactos profesionales para que los revises.')
p('Los mensajes privados pueden integrarse bajo las reglas de mensajería de Meta. La conversación debe iniciarla la otra persona y hay límites de acceso al historial. No equivale a descargar todo tu buzón ni a poder escribir a cualquier seguidor. Conviene guardar solo lo necesario y mantener esta información dentro del panel privado.')
h('Menciones y contexto del sector')
p('Según la conexión, es posible localizar menciones, contenido con determinadas etiquetas y datos públicos básicos de otras cuentas profesionales. Esto podría ayudarte a seguir colaboraciones o referencias. No da acceso a las estadísticas privadas de otros perfiles ni a todo lo que se publica en Instagram.')
h('Campañas pagadas')
p('Si promocionas contenido, se puede conectar también la cuenta de anuncios. Así podrías comparar inversión, impresiones, clics y resultados medidos. Necesita autorización propia. Los resultados pagados y los orgánicos deben identificarse por separado para interpretar bien el rendimiento.')
h('Publicar desde tu plataforma')
p('La conexión oficial permite publicar ciertos formatos con los permisos adecuados. Podríamos añadir programación de publicaciones y relacionar cada una con su noticia o sesión de fotos. El beneficio para el análisis sería registrar qué publicaste y cuándo. Los formatos admitidos dependen del tipo de cuenta y de la conexión.')
sources([('Meta · Capacidades de Instagram y publicación',S['meta']),('Meta · Mensajería y restricciones',S['messages']),('Meta · Estadísticas de anuncios',S['ads'])])
end()

page('Parte 2 · Formas de integrar','Cómo reunir la información','Se pueden combinar varios caminos. Cada uno resuelve una necesidad diferente.')
h('Conexión automática con Meta')
p('Es el camino principal para actualizar estadísticas dentro de tu panel. Reutilizaríamos la integración que ya existe y añadiríamos un guardado periódico. Requiere mantener los permisos, gestionar los límites de consultas y adaptar la conexión cuando Meta cambie sus métricas.')
h('Archivos y registros manuales')
p('Podemos crear un importador para los informes que tu cuenta permita exportar desde las herramientas de Meta. También podrías aportar tu archivo de información de Instagram. Antes de importarlo habría que revisar qué contiene, porque un archivo personal no equivale a un informe completo de rendimiento.')
p('Si un dato solo aparece en la aplicación de Instagram, podemos prever un registro manual. Siempre quedaría identificado como introducido por ti, junto con su fecha. La exportación exacta disponible en tu cuenta debe comprobarse dentro de Meta.')
h('Una herramienta externa como intermediaria')
p('Un servicio de analítica o automatización podría enviar datos a tu plataforma. Puede ahorrar desarrollo inicial, aunque habría que comprobar qué exporta, con qué frecuencia y cuánto cuesta. También está sujeto a los permisos y límites de Instagram. Tener un intermediario no garantiza más información.')
h('Mostrar Instagram dentro de tus noticias')
p('Podemos incorporar publicaciones públicas mediante un enlace o una inserción compatible. Sirve para enseñar tu trabajo o ilustrar una noticia. Esa visualización y la recogida de estadísticas son funciones distintas. La disponibilidad del contenido seguirá dependiendo de Instagram.')
h('Relacionar Instagram con las visitas a la web')
p('Mi propuesta es usar enlaces identificados por publicación o campaña. Por ejemplo, un enlace de una historia puede indicar que viene de Instagram y de una noticia concreta. Al activar la medición real de la web, podríamos comparar clics, llegadas y lectura. Habrá pérdidas de medición y no identificará automáticamente a cada visitante con su perfil de Instagram.')
end()

page('Parte 2 · Un archivo útil','Guardar para poder comparar','Propuesta para la siguiente fase. Este historial todavía no está implementado.')
p('La mejora más valiosa sería guardar pequeñas fotografías de los resultados a lo largo del tiempo. No hace falta copiar todo Instagram. Hace falta conservar los datos disponibles, con su fecha y su significado.')
for title,text in [
 ('Cada día','Guardar el resumen de la cuenta, su evolución y el estado de la conexión. Registrar también cuándo falta información.'),
 ('Después de publicar','Revisar cada pieza a edades comparables. Por ejemplo, a las 24 horas, a los 7 días y a los 30 días. Así una foto antigua no gana simplemente por haber tenido más tiempo.'),
 ('Mientras una historia está disponible','Consultar con más frecuencia. Meta limita sus estadísticas a una ventana breve de 24 horas. Algunas conexiones permiten avisos automáticos de historias, pero hay que comprobar su compatibilidad con la vía actual.'),
 ('Junto a cada pieza','Guardar el tema, formato, fecha, colaboración, objetivo y enlace a la noticia, si existe. También el nombre de cada métrica y el momento de recogida para poder entender cambios futuros.')]:h(title);p(text)
box('<b>El pasado tiene límites</b><br/>La guía de Meta indica hasta 90 días para métricas de cuenta y hasta 2 años para métricas de publicaciones, con excepciones. No podemos prometer recuperar todo tu historial. Empezar a guardar ahora mejora las comparaciones futuras.')
p('Un dato ausente debe aparecer como no disponible. No hay que convertirlo en cero. Tampoco debemos sumar el alcance de varios días y llamarlo personas únicas de la semana, porque una persona puede repetirse.')
sources([('Meta · Disponibilidad y límites de estadísticas',S['guide']),('Meta · Ventanas de datos de publicaciones e historias',S['media'])])
end()

page('Parte 2 · Análisis','Qué podrías aprender','Ejemplos de análisis futuros. No describen resultados reales de tu perfil.')
h('Qué contenido ayuda a cada objetivo')
p('Una sesión de modelaje puede buscar contactos profesionales. Una noticia puede buscar lectores. Un reel puede buscar llegar a personas nuevas. Definir el objetivo permite valorar cada publicación con las señales adecuadas, en lugar de usar únicamente los me gusta.')
h('Comparar con contexto')
p('Podríamos ordenar publicaciones por guardados o compartidos en relación con su alcance, comparando formatos y antigüedad similares. También separaríamos campañas pagadas, colaboraciones y publicaciones habituales. El panel explicaría cómo calcula cada indicador.')
h('Un ejemplo fácil')
box('Imagina dos publicaciones que llegan a 1.000 cuentas cada una. Una recibe 20 guardados y otra 5. La primera tiene más guardados por cuenta alcanzada. Eso sugiere interés en conservarla, pero no demuestra por sí solo que consiga más clientes o más lectores.')
h('Informes y avisos del día')
p('La sección de novedades del inicio podría mostrar caídas inusuales, piezas que siguen creciendo, preguntas repetidas o datos que no se están recogiendo. Un informe semanal podría resumir qué probar la semana siguiente. La IA podría redactar esas sugerencias a partir de los datos guardados, indicando las dudas.')
h('Lo que no conviene prometer')
p('Las estadísticas oficiales no ofrecen una lista completa de quién visita tu perfil o quién guarda o comparte cada publicación. Los datos de audiencia son agrupados. Tampoco debemos contar con un listado completo de seguidores, todos los resultados de encuestas o una curva detallada de cada segundo de un reel por estas vías.')
p('Podemos detectar relaciones, pero no demostrar automáticamente sus causas. Si un reel crece al publicarlo por la tarde, también pueden influir el tema, la calidad, una colaboración o una promoción.')
sources([('Meta · Datos de audiencia y sus límites',S['account']),('Meta · Métricas disponibles por formato',S['media'])])
end()

page('Parte 2 · Próximos pasos','Por dónde empezaría','Una propuesta práctica para aprovechar lo construido y avanzar por etapas.')
h('1. Comprobar la conexión actual')
p('Confirmar tu cuenta profesional, los permisos y las métricas que realmente devuelve. Comparar varias publicaciones con la aplicación de Instagram, usando el mismo período. Revisar especialmente fechas, historias y tiempos de reproducción.')
h('2. Guardar el historial automáticamente')
p('Añadir en Supabase el archivo de resultados y una tarea que lo actualice. Incluir avisos cuando falten datos, exportación para ti y una fecha visible de última actualización. Esta sería mi prioridad.')
h('3. Relacionar contenido y objetivos')
p('Clasificar publicaciones por modelaje, periodismo, colaboraciones u otros temas que elijas. Incorporar enlaces identificados hacia la web y sustituir la muestra de audiencia por medición real. Crear comparaciones e informes comprensibles.')
h('4. Ampliar según lo que te resulte útil')
p('Agregar comentarios, anuncios o mensajes si ayudan a decisiones concretas. Después, estudiar publicación programada, resúmenes con IA y sugerencias en el inicio. Cada ampliación necesita sus permisos y su desarrollo.')
box('<b>Lo que tendrías que decidir tú</b><br/>Qué quieres mejorar primero, qué cuenta usarás, si quieres analizar mensajes privados y si habrá campañas pagadas. La configuración técnica y el diseño de los informes pueden resolverse a partir de esas decisiones.')
p('El coste dependerá del desarrollo, del alojamiento, del volumen guardado y de posibles servicios externos. Una suscripción a una herramienta o las campañas publicitarias serían partidas aparte. No hace falta contratar todo para comenzar.')
p('<b>Sobre esta guía.</b> Elaborada a partir de CONTEXTO_IA.md y el código local del portal, el editor y la integración de Instagram, revisados el 13 de noviembre de 2026. Las fuentes de Meta están enlazadas en las páginas correspondientes. Sus capacidades pueden cambiar. Este documento no añade ni activa ninguna integración.','small')
end()
c.save()
print(OUT)
