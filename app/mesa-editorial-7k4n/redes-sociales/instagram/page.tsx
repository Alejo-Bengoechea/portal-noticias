import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase';
import { connectInstagram, type InstagramMedia } from '@/lib/instagram';
import { webUrl } from '@/lib/format';
import styles from '@/components/social-dashboard.module.css';
import instagram from './instagram.module.css';

const base = '/mesa-editorial-7k4n/redes-sociales';
const path = `${base}/instagram`;
const number = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const labels: Record<string, string> = {
  followers_count: 'Seguidores', follows_count: 'Cuentas seguidas', media_count: 'Publicaciones en el perfil',
  views: 'Visualizaciones', reach: 'Alcance', accounts_engaged: 'Cuentas que interactuaron',
  total_interactions: 'Interacciones', likes: 'Me gusta', comments: 'Comentarios', shares: 'Compartidos',
  saves: 'Guardados', saved: 'Guardados', replies: 'Respuestas', reposts: 'Republicaciones',
  profile_views: 'Visitas al perfil', profile_links_taps: 'Toques en enlaces del perfil',
  profile_visits: 'Visitas al perfil', profile_activity: 'Acciones en el perfil', follows: 'Nuevos seguidores',
  ig_reels_avg_watch_time: 'Tiempo medio de reproducción (s)', ig_reels_video_view_total_time: 'Tiempo total de reproducción (s)',
  reels_skip_rate: 'Tasa de abandono (%)', crossposted_views: 'Visualizaciones de publicación cruzada',
  facebook_views: 'Visualizaciones en Facebook', navigation: 'Acciones de navegación', link_clicks: 'Toques en enlaces',
  FOLLOWER: 'Seguidores', NON_FOLLOWER: 'No seguidores', NONFOLLOWER: 'No seguidores',
  FOLLOW: 'Nuevos seguidores', UNFOLLOW: 'Bajas', FEED: 'Publicaciones', REELS: 'Reels', STORY: 'Historias',
  tap_forward: 'Avanzar', tap_back: 'Volver', tap_exit: 'Salir', swipe_forward: 'Siguiente historia',
};
const errors: Record<string, string> = {
  setup: 'Configura INSTAGRAM_ACCESS_TOKEN en el servidor para conectar @alejobengo.',
  'invalid-id': 'INSTAGRAM_ACCOUNT_ID debe ser el identificador numérico de Instagram.',
  discovery: 'Meta no devolvió @alejobengo entre las cuentas asignadas. Comprueba el portfolio o configura INSTAGRAM_ACCOUNT_ID con el identificador numérico de la cuenta.',
  'wrong-account': 'La cuenta que devolvió Meta no corresponde a @alejobengo.',
  token: 'Meta rechazó el token. Revisa su validez y vuelve a configurarlo.',
  permission: 'Meta denegó el acceso. Revisa los permisos y los activos asignados al token.',
  limit: 'Meta limitó temporalmente las consultas. Inténtalo más tarde.',
  network: 'No se pudo contactar con Meta. Inténtalo de nuevo.',
  unavailable: 'Meta no devolvió datos para esta consulta.',
};

type Params = Record<string, string | string[] | undefined>;
type Client = Extract<Awaited<ReturnType<typeof connectInstagram>>, { status: 'connected' }>['client'];
type Row = { label: string; value: number };

function href(query: Record<string, string> = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value)).toString();
  return params ? `${path}?${params}` : path;
}

function MetricList({ values }: { values: Record<string, number | null | undefined> }) {
  return <dl className={styles.metrics}>
    {Object.entries(values).map(([key, value]) => <div className={styles.panel} key={key}>
      <dt>{labels[key] ?? key}</dt>
      <dd>{value == null ? '—' : number.format(key.startsWith('ig_reels_') ? value / 1000 : value)}</dd>
    </div>)}
  </dl>;
}

function Breakdown({ title, rows }: { title: string; rows: Row[] }) {
  return <section className={styles.panel}>
    <h2>{title}</h2>
    {rows.length ? <dl className={styles.breakdown}>{rows.map(row => <div key={row.label}>
      <dt>{labels[row.label.toUpperCase()] ?? labels[row.label] ?? row.label}</dt><dd>{number.format(row.value)}</dd>
    </div>)}</dl> : <p>Sin datos disponibles.</p>}
  </section>;
}

async function Overview({ client, days }: { client: Client; days: number }) {
  const overview = await client.overview(days);
  const main = ['views', 'reach', 'total_interactions', 'accounts_engaged'];
  const { followers_count, follows_count, media_count } = client.profile;
  const maxReach = Math.max(1, ...overview.trend.map(point => point.value));
  const other = Object.fromEntries(Object.entries(overview.totals).filter(([key, value]) => !main.includes(key) && value !== null));
  return <>
    <section className={instagram.section} aria-labelledby="ig-profile">
      <h2 id="ig-profile">Cuenta</h2>
      <MetricList values={{ followers_count, follows_count, media_count }} />
    </section>
    <section className={instagram.section} aria-labelledby="ig-period">
      <h2 id="ig-period">Rendimiento · últimos {days} días completos</h2>
      <nav className={instagram.links} aria-label="Periodo">
        {[7, 28].map(value => <Link key={value} href={href({ dias: String(value) })} aria-current={days === value ? 'true' : undefined}>{value} días</Link>)}
      </nav>
      <p>{date.format(overview.since * 1000)} – {date.format(overview.until * 1000 - 1)} · UTC</p>
      {overview.error && <p role="status">{errors[overview.error]}</p>}
      <MetricList values={Object.fromEntries(main.map(key => [key, overview.totals[key]]))} />
      {Object.keys(other).length > 0 && <MetricList values={other} />}
    </section>
    <section className={styles.panel}>
      <h2>Alcance diario</h2>
      {overview.trend.length ? <ol className={styles.chart}>{overview.trend.map(point => <li key={point.date}>
        <time dateTime={point.date}>{date.format(new Date(point.date))}</time>
        <div className={styles.track} aria-hidden="true"><i style={{ width: `${point.value / maxReach * 100}%`, background: '#c5a2fa' }} /></div>
        <strong>{number.format(point.value)}</strong>
      </li>)}</ol> : <p>Sin datos disponibles para este periodo.</p>}
    </section>
    <div className={instagram.columns}>
      <Breakdown title="Seguimientos y bajas" rows={overview.growth} />
      <Breakdown title="Visualizaciones según audiencia" rows={overview.viewsByAudience} />
      <Breakdown title="Alcance por formato" rows={overview.reachByFormat} />
    </div>
  </>;
}

async function Audience({ client, params }: { client: Client; params: Params }) {
  const groups = [
    { key: 'follower', name: 'Seguidores' },
    { key: 'reached_audience', name: 'Cuentas alcanzadas' },
    { key: 'engaged_audience', name: 'Cuentas que interactuaron' },
  ] as const;
  const group = groups.find(item => item.key === params.grupo) ?? groups[0];
  const dimensions = { age: 'Edad', gender: 'Género', city: 'Ciudades', country: 'Países' };
  const data = await client.audience(group.key);
  return <>
    <nav className={instagram.links} aria-label="Tipo de audiencia">{groups.map(item =>
      <Link key={item.key} href={href({ vista: 'audiencia', grupo: item.key })} aria-current={item.key === group.key ? 'true' : undefined}>{item.name}</Link>
    )}</nav>
    <p>Desglose del mes actual, sujeto a la disponibilidad de Meta.</p>
    <div className={instagram.columns}>{data.map(item =>
      <Breakdown key={item.dimension} title={dimensions[item.dimension]} rows={item.rows} />
    )}</div>
    {data.every(item => item.error === 'permission') && <p role="status">{errors.permission}</p>}
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
  if (!media.ok) return <p role="status">{errors[media.reason]}</p>;
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
      {stats.error && <p role="status">{errors[stats.error]}</p>}
      <p>Métricas acumuladas de esta pieza. Un guion indica que Meta no devolvió ese dato.</p>
      <MetricList values={{ ...stats.metrics,
        ...(stories ? {} : { likes: stats.metrics.likes ?? selected.like_count, comments: stats.metrics.comments ?? selected.comments_count }),
        views: stats.metrics.views, reach: stats.metrics.reach,
      }} />
      {stats.navigation.length > 0 && <Breakdown title="Navegación en la historia" rows={stats.navigation} />}
    </section>}
    {items.length ? <ul className={instagram.content}>{items.map(item => {
      const permalink = webUrl(item.permalink);
      const timestamp = item.timestamp && Number.isFinite(Date.parse(item.timestamp)) ? item.timestamp : null;
      return <li key={item.id} className={styles.panel}>
        <p className={instagram.meta}>{stories ? 'Historia' : mediaFormat(item)}{timestamp && <> · <time dateTime={timestamp}>{date.format(new Date(timestamp))}</time></>}</p>
        <h3>{item.caption?.trim().slice(0, 160) || (stories ? 'Historia sin texto' : 'Publicación sin texto')}</h3>
        {!stories && <p className={instagram.meta}>{item.like_count == null ? '—' : number.format(item.like_count)} Me gusta · {item.comments_count == null ? '—' : number.format(item.comments_count)} comentarios</p>}
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
      <div><h1>Instagram</h1><p>@alejobengo</p></div>
    </header>
    {connection.status !== 'connected' ? <section className={styles.panel}>
      <h2>{connection.status === 'setup' ? 'Conexión pendiente' : 'No se pudieron cargar los datos'}</h2>
      <p role="status">{errors[connection.status]}{'code' in connection && connection.code ? ` (Meta: ${connection.code})` : ''}</p>
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
