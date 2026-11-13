import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { connectInstagram, refreshInstagram, type InsightStatus, type InstagramMedia } from '@/lib/instagram';
import { webUrl } from '@/lib/format';
import styles from '@/components/social-dashboard.module.css';
import instagram from './instagram.module.css';

const base = '/mesa-editorial-7k4n/redes-sociales';
const path = `${base}/instagram`;
const number = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const consulted = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });
const countries = new Intl.DisplayNames('es', { type: 'region', fallback: 'none' });

async function updateInstagram() {
  'use server';
  if (!await adminClient()) redirect('/mesa-editorial-7k4n/login');
  refreshInstagram();
  revalidatePath(path);
}

const labels: Record<string, string> = {
  followers_count: 'Seguidores', follows_count: 'Cuentas seguidas', media_count: 'Publicaciones en el perfil',
  views: 'Visualizaciones', reach: 'Alcance', accounts_engaged: 'Cuentas que interactuaron',
  total_interactions: 'Interacciones', likes: 'Me gusta', comments: 'Comentarios', shares: 'Compartidos',
  saves: 'Guardados', saved: 'Guardados', replies: 'Respuestas', reposts: 'Republicaciones',
  profile_links_taps: 'Toques en enlaces del perfil',
  profile_visits: 'Visitas al perfil', profile_activity: 'Acciones en el perfil', follows: 'Nuevos seguidores',
  ig_reels_avg_watch_time: 'Tiempo medio de reproducción', ig_reels_video_view_total_time: 'Tiempo total de reproducción',
  reels_skip_rate: 'Saltos en los 3 primeros segundos', crossposted_views: 'Visualizaciones de publicación cruzada',
  facebook_views: 'Visualizaciones en Facebook', navigation: 'Acciones de navegación', link_clicks: 'Toques en enlaces',
};
const breakdownLabels: Record<string, Record<string, string>> = {
  growth: { FOLLOWER: 'Nuevos seguidores', NON_FOLLOWER: 'Bajas', UNKNOWN: 'Sin clasificar' },
  audience: { FOLLOWER: 'Seguidores', NON_FOLLOWER: 'No seguidores', NONFOLLOWER: 'No seguidores', UNKNOWN: 'Sin clasificar' },
  format: { POST: 'Publicaciones', FEED: 'Publicaciones', REEL: 'Reels', REELS: 'Reels', CAROUSEL_CONTAINER: 'Carruseles', AD: 'Anuncios', STORY: 'Historias', UNKNOWN: 'Sin clasificar' },
  navigation: { TAP_FORWARD: 'Avanzar', TAP_BACK: 'Volver', TAP_EXIT: 'Salir', SWIPE_FORWARD: 'Siguiente historia' },
  gender: { F: 'Mujeres', M: 'Hombres', U: 'Sin especificar' },
};
const missing = 'Un guion indica que Meta no devolvió ese dato; 0 es un cero real.';
const errors: Record<string, string> = {
  setup: 'Configura INSTAGRAM_ACCESS_TOKEN en el servidor para conectar @alejobengo.',
  'invalid-id': 'INSTAGRAM_ACCOUNT_ID debe ser el identificador numérico de Instagram.',
  discovery: 'Meta no devolvió @alejobengo entre las cuentas asignadas. Comprueba el portfolio o configura INSTAGRAM_ACCOUNT_ID con el identificador numérico de la cuenta.',
  'wrong-account': 'La cuenta que devolvió Meta no corresponde a @alejobengo.',
  token: 'Meta rechazó el token. Revisa su validez y vuelve a configurarlo.',
  permission: 'Meta denegó el acceso. Revisa los permisos y los activos asignados al token.',
  limit: 'Meta limitó temporalmente las consultas. Inténtalo más tarde.',
  network: 'No se pudo contactar con Meta. Inténtalo de nuevo.',
  unavailable: 'No se pudo completar esta consulta a Meta.',
  unsupported: 'Meta no admite una o más métricas de este bloque.',
  insufficient: 'Esta historia todavía no tiene espectadores suficientes: Meta exige al menos 5.',
};

type Params = Record<string, string | string[] | undefined>;
type Client = Extract<Awaited<ReturnType<typeof connectInstagram>>, { status: 'connected' }>['client'];
type Row = { label: string; value: number };

function href(query: Record<string, string> = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value)).toString();
  return params ? `${path}?${params}` : path;
}

function metricText(key: string, value: number) {
  // B5: confirm duration units and skip-rate scale against the Instagram app.
  if (!key.startsWith('ig_reels_')) return number.format(value);
  const seconds = value / 1000;
  if (seconds < 60) return number.format(seconds) + ' s';
  const whole = Math.round(seconds);
  return [Math.floor(whole / 3600) + ' h', Math.floor(whole / 60) % 60 + ' min', whole % 60 + ' s']
    .filter(part => part !== '0 h').join(' ');
}

function MetricList({ values }: { values: Record<string, number | null | undefined> }) {
  return <dl className={styles.metrics}>
    {Object.entries(values).map(([key, value]) => <div className={styles.panel} key={key}>
      <dt>{labels[key] ?? key}</dt>
      <dd>{value == null ? '—' : metricText(key, value)}</dd>
      {value == null && <small>{key === 'replies' ? 'No disponible para cuentas de Europa' : 'Meta no devolvió este dato'}</small>}
    </div>)}
  </dl>;
}

function notice(reason: string, waitMinutes?: number) {
  return reason === 'limit' && waitMinutes
    ? 'Meta limitó temporalmente las consultas. Vuelve a intentarlo en ' + number.format(waitMinutes) + ' min.'
    : errors[reason];
}

function BlockNotice({ status }: { status: InsightStatus }) {
  if (status.state === 'ok') return null;
  if (status.state === 'empty') return <p>Sin datos disponibles.</p>;
  if ('reason' in status) return <p role="status">{status.state === 'partial' ? 'Datos parciales. ' : ''}{notice(status.reason, status.waitMinutes)}</p>;
  return <p role="status">{errors[status.state]}</p>;
}

function Breakdown({ title, block, context, note }: { title: string; block: { rows: Row[]; status: InsightStatus }; context: string; note?: string }) {
  // B2: confirm Meta's FOLLOWER/NON_FOLLOWER interpretation against account insights.
  const rows = block.rows.map(row => {
    const key = row.label.toUpperCase();
    const translated = context === 'country' && /^[A-Z]{2}$/.test(key) ? countries.of(key) : breakdownLabels[context]?.[key];
    return { ...row, label: translated ?? (context === 'age' || context === 'city' ? row.label : row.label + ' (sin traducir)') };
  });
  const gained = context === 'growth' ? block.rows.find(row => row.label.toUpperCase() === 'FOLLOWER')?.value : undefined;
  const lost = context === 'growth' ? block.rows.find(row => row.label.toUpperCase() === 'NON_FOLLOWER')?.value : undefined;
  return <section className={styles.panel}>
    <h2>{title}</h2>
    {note && <p>{note}</p>}
    <BlockNotice status={block.status} />
    {!!rows.length && <dl className={styles.breakdown}>
      {rows.map((row, index) => <div key={index}><dt>{row.label}</dt><dd>{number.format(row.value)}</dd></div>)}
      {gained !== undefined && lost !== undefined && <div><dt>Saldo neto</dt><dd>{number.format(gained - lost)}</dd></div>}
    </dl>}
  </section>;
}

async function Overview({ client, days }: { client: Client; days: number }) {
  const overview = await client.overview(days);
  const main = ['views', 'reach', 'total_interactions', 'accounts_engaged'];
  const { followers_count, follows_count, media_count } = client.profile;
  const maxReach = Math.max(1, ...overview.trend.rows.map(point => point.value));
  const other = Object.fromEntries(Object.entries(overview.totals).filter(([key, value]) => !main.includes(key)));
  return <>
    <section className={instagram.section} aria-labelledby="ig-profile">
      <h2 id="ig-profile">Cuenta</h2>
      <MetricList values={{ followers_count, follows_count, media_count }} />
    </section>
    <section className={instagram.section} aria-labelledby="ig-period">
      <h2 id="ig-period">Rendimiento · {days} días</h2>
      <nav className={instagram.links} aria-label="Periodo">
        {[7, 28].map(value => <Link key={value} href={href({ dias: String(value) })} aria-current={days === value ? 'true' : undefined}>{value} días</Link>)}
      </nav>
      <p>{consulted.formatRange(overview.since * 1000, overview.until * 1000 - 1)} · Madrid</p>
      <p>Meta agrega por días con su propio huso. Los dos últimos días pueden estar incompletos por un retraso de hasta 48 horas.</p>
      <p>Las interacciones de cuenta pueden incluir contenido promocionado. {missing}</p>
      <BlockNotice status={overview.totalStatus} />
      <MetricList values={Object.fromEntries(main.map(key => [key, overview.totals[key]]))} />
      {Object.keys(other).length > 0 && <MetricList values={other} />}
    </section>
    <section className={styles.panel}>
      <h2>Alcance diario</h2>
      <p>Estimación de cuentas únicas. Los valores de distintos días o formatos pueden incluir las mismas cuentas y no se deben sumar. Las fechas indican el cierre informado por Meta.</p>
      <BlockNotice status={overview.trend.status} />
      {!!overview.trend.rows.length && <ol className={styles.chart}>{overview.trend.rows.map(point => <li key={point.date}>
        <time dateTime={point.date}>{date.format(new Date(point.date))}</time>
        <div className={styles.track} aria-hidden="true"><i style={{ width: `${point.value / maxReach * 100}%`, background: '#c5a2fa' }} /></div>
        <strong>{number.format(point.value)}</strong>
      </li>)}</ol>}
    </section>
    <div className={instagram.columns}>
      <Breakdown title="Seguimientos y bajas" block={overview.growth} context="growth" note="Interpretación del desglose pendiente de contrastar con Instagram." />
      <Breakdown title="Visualizaciones según audiencia" block={overview.viewsByAudience} context="audience" />
      <Breakdown title="Alcance por formato" block={overview.reachByFormat} context="format" />
    </div>
  </>;
}

async function Audience({ client, params }: { client: Client; params: Params }) {
  const groups = [
    { key: 'follower', name: 'Seguidores' },
    { key: 'engaged_audience', name: 'Cuentas que interactuaron' },
  ] as const;
  const group = groups.find(item => item.key === params.grupo) ?? groups[0];
  const dimensions = { age: 'Edad', gender: 'Género', city: 'Ciudades', country: 'Países' };
  const data = await client.audience(group.key);
  return <>
    <nav className={instagram.links} aria-label="Tipo de audiencia">{groups.map(item =>
      <Link key={item.key} href={href({ vista: 'audiencia', grupo: item.key })} aria-current={item.key === group.key ? 'true' : undefined}>{item.name}</Link>
    )}</nav>
    <p>Últimos 30 días. Meta puede devolver hasta los 45 valores principales por dimensión.</p>
    <div className={instagram.columns}>{data.map(item =>
      <Breakdown key={item.dimension} title={dimensions[item.dimension]} block={item} context={item.dimension} />
    )}</div>
  </>;
}

function mediaFormat(item: InstagramMedia) {
  if (item.media_product_type === 'REELS') return 'Reel';
  if (item.media_product_type === 'STORY') return 'Historia';
  return ({ CAROUSEL_ALBUM: 'Carrusel', IMAGE: 'Foto', VIDEO: 'Vídeo' } as Record<string, string>)[item.media_type ?? ''] ?? 'Publicación';
}

function cursor(value: string | string[] | undefined) {
  return typeof value === 'string' && value.length <= 1024 && /^[A-Za-z0-9_+=/-]+$/.test(value) ? value : undefined;
}

async function Content({ client, params }: { client: Client; params: Params }) {
  const stories = params.tipo === 'historias';
  const after = cursor(params.despues);
  const before = after ? undefined : cursor(params.antes);
  const order = !stories && (params.orden === 'me-gusta' || params.orden === 'comentarios') ? params.orden : undefined;
  const query = { vista: 'contenido', ...(stories ? { tipo: 'historias' } : {}), ...(order ? { orden: order } : {}), ...(after ? { despues: after } : before ? { antes: before } : {}) };
  const media = await client.media(stories, { ...(after ? { after } : before ? { before } : {}) });
  if (!media.ok) return <p role="status">{notice(media.reason, media.waitMinutes)}</p>;
  const items = (media.data.data ?? []).filter(item => /^\d{1,32}$/.test(item.id));
  if (order) {
    const field = order === 'me-gusta' ? 'like_count' : 'comments_count';
    items.sort((a, b) => (b[field] ?? -1) - (a[field] ?? -1));
  }
  const selected = items.find(item => item.id === params.pieza);
  const paging = media.data.paging;
  const stats = selected ? await client.mediaInsights(selected, stories) : null;
  return <>
    <nav className={instagram.links} aria-label="Tipo de contenido">
      <Link href={href({ vista: 'contenido' })} aria-current={!stories ? 'true' : undefined}>Publicaciones y Reels</Link>
      <Link href={href({ vista: 'contenido', tipo: 'historias' })} aria-current={stories ? 'true' : undefined}>Historias activas</Link>
    </nav>
    {!stories && <nav className={instagram.links} aria-label="Orden de esta página">
      <span>Ordenar esta página</span>
      <Link href={href({ ...query, orden: 'recientes' })} aria-current={!order ? 'true' : undefined}>Recientes</Link>
      <Link href={href({ ...query, orden: 'me-gusta' })} aria-current={order === 'me-gusta' ? 'true' : undefined}>Me gusta</Link>
      <Link href={href({ ...query, orden: 'comentarios' })} aria-current={order === 'comentarios' ? 'true' : undefined}>Comentarios</Link>
    </nav>}
    {selected && stats && <section id="detalle" className={instagram.section}>
      <div className={styles.heading}><h2>Detalle · {stories ? 'Historia' : mediaFormat(selected)}</h2>
        <Link href={href(query)}>Cerrar detalle</Link>
      </div>
      {selected.caption && <p>{selected.caption}</p>}
      <p>Métricas acumuladas de esta pieza. {missing}</p>
      {stats.blocks.map((block, index) => <div key={index} className={instagram.section}>
        <BlockNotice status={block.status} />
        <MetricList values={block.metrics} />
      </div>)}
      {stories && <MetricList values={{ replies: null }} />}
      {stats.navigation && <Breakdown title="Navegación en la historia" block={stats.navigation} context="navigation" />}
    </section>}
    {!stories && <p>Los Me gusta de esta lista excluyen los obtenidos por promoción.</p>}
    {items.length ? <ul className={instagram.content}>{items.map(item => {
      const permalink = webUrl(item.permalink);
      const timestamp = item.timestamp && Number.isFinite(Date.parse(item.timestamp)) ? item.timestamp : null;
      return <li key={item.id} className={styles.panel}>
        <p className={instagram.meta}>{stories ? 'Historia' : mediaFormat(item)}{timestamp && <> · <time dateTime={timestamp}>{date.format(new Date(timestamp))}</time></>}</p>
        <h3>{item.caption?.trim().slice(0, 160) || (stories ? 'Historia sin texto' : 'Publicación sin texto')}</h3>
        {!stories && <p className={instagram.meta}>{item.like_count == null ? '—' : number.format(item.like_count)} Me gusta · {item.comments_count == null ? '—' : number.format(item.comments_count)} {item.comments_count === 1 ? 'comentario' : 'comentarios'}</p>}
        <div className={instagram.links}>
          <Link prefetch={false} href={href({ ...query, pieza: item.id }) + '#detalle'} aria-current={selected?.id === item.id ? 'true' : undefined}>Ver métricas</Link>
          {permalink && <a href={permalink} target="_blank" rel="noreferrer">Abrir en Instagram</a>}
        </div>
      </li>;
    })}</ul> : <p>{stories ? 'Meta no devolvió historias activas.' : 'Meta no devolvió publicaciones.'}</p>}
    <nav className={instagram.links} aria-label="Páginas de contenido">
      {paging?.previous && paging.cursors?.before && <Link href={href({ ...query, despues: '', antes: paging.cursors.before })}>Anterior</Link>}
      {paging?.next && paging.cursors?.after && <Link href={href({ ...query, antes: '', despues: paging.cursors.after })}>Siguiente</Link>}
    </nav>
  </>;
}

export default async function InstagramPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!await adminClient()) redirect('/mesa-editorial-7k4n/login');
  const [params, connection] = await Promise.all([searchParams, connectInstagram()]);
  const view = params.vista === 'contenido' || params.vista === 'audiencia' ? params.vista : 'resumen';
  return <div className={styles.dashboard}>
    <Link href={base}>← Redes Sociales</Link>
    <header className={styles.heading}>
      <div><h1>Instagram</h1><p>@alejobengo</p>{connection.status === 'connected' && <p>Consultado el {consulted.format(new Date()).replace(', ', ' a las ')} · Madrid</p>}</div>
      <form action={updateInstagram}><button type="submit">Actualizar</button></form>
    </header>
    {connection.status !== 'connected' ? <section className={styles.panel}>
      <h2>{connection.status === 'setup' ? 'Conexión pendiente' : 'No se pudieron cargar los datos'}</h2>
      <p role="status">{notice(connection.status, 'waitMinutes' in connection ? connection.waitMinutes : undefined)}{'code' in connection && connection.code ? ` (Meta: ${connection.code})` : ''}</p>
    </section> : <>
      <nav className={instagram.links} aria-label="Estadísticas de Instagram">
        {([{ key: 'resumen', label: 'Resumen' }, { key: 'contenido', label: 'Contenido' }, { key: 'audiencia', label: 'Audiencia' }]).map(item =>
          <Link key={item.key} href={href({ vista: item.key })} aria-current={view === item.key ? 'page' : undefined}>{item.label}</Link>
        )}
      </nav>
      {view === 'resumen' && <Overview client={connection.client} days={params.dias === '7' ? 7 : 28} />}
      {view === 'contenido' && <Content client={connection.client} params={params} />}
      {view === 'audiencia' && <Audience client={connection.client} params={params} />}
    </>}
  </div>;
}
