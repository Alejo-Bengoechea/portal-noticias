'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type CSSProperties, type ReactNode } from 'react';
import { audiencePeriods, sum, type AudienceData, type AudienceDay } from '@/lib/audience';

const number = (value: number) => new Intl.NumberFormat('es-ES').format(value);
const compact = (value: number) => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const percent = (part: number, whole: number) => whole ? `${(part / whole * 100).toFixed(1).replace('.', ',')}%` : '0%';
const longDate = (key: string) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${key}T00:00:00Z`));

function niceMax(value: number) {
  if (value <= 5) return 5;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step * 2) / 2 * step;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="analytics-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}
function Card({ index, title, subtitle, children, control }: { index: string; title: string; subtitle: string; children: ReactNode; control?: ReactNode }) {
  return <section className="analytics-card" aria-labelledby={`analytics-title-${index}`}>
    <header className="analytics-card-head"><div><h2 id={`analytics-title-${index}`}>{title}</h2><p>{subtitle}</p></div></header>
    {control}
    {children}
  </section>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="analytics-empty">{children}</p>;
}

function TrendChart({ days, views, secondary, secondaryLabel, color, title }: { days: AudienceDay[]; views: number[]; secondary?: number[]; secondaryLabel?: string; color: string; title: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState<number | null>(null);
  const top = 18, bottom = 172, left = 44, right = 624;
  const max = niceMax(Math.max(...views, ...(secondary ?? [])));
  const every = Math.ceil(days.length / 8);
  const x = (i: number) => left + i * (right - left) / Math.max(days.length - 1, 1);
  const y = (value: number) => bottom - value / max * (bottom - top);
  function curve(values: number[]) {
    return values.map((value, i) => i === 0 ? `M${x(i)},${y(value)}` : `C${(x(i - 1) + x(i)) / 2},${y(values[i - 1])} ${(x(i - 1) + x(i)) / 2},${y(value)} ${x(i)},${y(value)}`).join(' ');
  }
  const detail = (i: number) => `${days[i].label}: ${number(views[i])} vistas${secondary ? `, ${number(secondary[i])} ${secondaryLabel?.toLocaleLowerCase('es')}` : ''}`;
  return <figure className="analytics-trend">
    <svg viewBox="0 0 650 214" role="img" aria-label={title}>
      <title>{title}</title><desc>Serie diaria real. Los valores se pueden consultar en la tabla inferior.</desc>
      <defs><linearGradient id={`analytics-fill-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".24" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map(fraction => <g key={fraction}><line x1={left} x2={right} y1={y(fraction * max)} y2={y(fraction * max)} stroke="#ffffff0c" strokeDasharray="3 5" /><text x={left - 10} y={y(fraction * max) + 4} textAnchor="end" className="analytics-axis">{compact(fraction * max)}</text></g>)}
      <path d={`${curve(views)} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#analytics-fill-${id})`} />
      {secondary && <path d={curve(secondary)} stroke="#79818e" strokeWidth="2" fill="none" strokeDasharray="5 5" />}
      <path d={curve(views)} stroke={color} strokeWidth="2.5" fill="none" />
      {active !== null && <line x1={x(active)} x2={x(active)} y1={top} y2={bottom} stroke={color} strokeOpacity=".5" strokeDasharray="3 4" />}
      {views.map((value, i) => <g key={days[i].key}>{(i % every === 0 || i === days.length - 1) && <text x={x(i)} y="200" textAnchor="middle" className="analytics-axis">{days[i].label}</text>}<circle cx={x(i)} cy={y(value)} r={active === i ? 5 : days.length > 7 ? 2 : 3} fill={color} />
        <circle className="analytics-chart-point" cx={x(i)} cy={y(value)} r={days.length > 7 ? 9 : 13} fill="transparent" tabIndex={0} aria-label={detail(i)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
      </g>)}
    </svg>
    <figcaption><span className="analytics-legend"><i style={{ background: color }} />Vistas{secondary && <><i className="analytics-legend-secondary" />{secondaryLabel}</>}</span><span className="analytics-point-value">{active !== null ? detail(active) : `Evolución de los últimos ${days.length} días`}</span></figcaption>
    <details className="analytics-data"><summary>Ver datos</summary><div><table><caption className="sr-only">{title}</caption><thead><tr><th>Día</th><th>Vistas</th>{secondary && <th>{secondaryLabel}</th>}</tr></thead><tbody>{views.map((value, i) => <tr key={days[i].key}><th scope="row">{days[i].label}</th><td>{number(value)}</td>{secondary && <td>{number(secondary[i])}</td>}</tr>)}</tbody></table></div></details>
  </figure>;
}

function Donut({ sources, total }: { sources: AudienceData['sources']; total: number }) {
  let offset = 0;
  const label = sources.map(source => `${source.name.toLocaleLowerCase('es')} ${percent(source.visits, total)}`).join(', ');
  return <figure className="analytics-donut"><svg viewBox="0 0 220 220" role="img" aria-label={`Origen de las visitas: ${label}`}><circle cx="110" cy="110" r="82" fill="none" stroke="#353535" strokeWidth="17" />{sources.filter(source => source.visits > 0).map(source => {
    const share = source.visits / total * 100;
    const start = offset; offset += share;
    const gap = share >= 100 ? 0 : Math.min(1.3, share / 2);
    return <circle key={source.key} cx="110" cy="110" r="82" fill="none" stroke={source.color} strokeWidth="17" pathLength="100" strokeDasharray={`${share - gap} ${100 - share + gap}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" />;
  })}<text x="110" y="105" textAnchor="middle" className="analytics-donut-number">{compact(total)}</text><text x="110" y="128" textAnchor="middle" className="analytics-donut-label">VISITAS</text></svg><figcaption>Canal de llegada de cada visita</figcaption></figure>;
}

const migrationNotice = <>Falta aplicar en Supabase la migración <code>202611170002_audience.sql</code>. Hasta entonces no hay datos de audiencia que mostrar.</>;

export function AnalyticsDashboard({ data }: { data: AudienceData }) {
  const { days, period } = data;
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [articleId, setArticleId] = useState(data.articles[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(data.categories[0]?.id ?? '');
  const article = data.articles.find(item => item.id === articleId) ?? data.articles[0];
  const category = data.categories.find(item => item.id === categoryId) ?? data.categories[0];
  const total = sum(data.portalViews);
  const visits = sum(data.portalVisits);
  const categoryTotal = (item: NonNullable<typeof category>) => sum(item.articleViews) + item.pageViews;
  const maxCategory = Math.max(1, ...data.categories.map(categoryTotal));
  const bestDay = category && sum(category.articleViews) > 0
    ? days.map((day, i) => ({ label: day.label, views: category.articleViews[i] })).reduce((best, day) => day.views > best.views ? day : best)
    : null;
  const topSource = data.sources[0];
  const hasSources = data.sourcesStatus === 'ok';

  return <div className="analytics-dashboard">
    <header className="analytics-overview">
      <div><span className="analytics-kicker">OBSERVATORIO / {String(period).padStart(2, '0')} DÍAS</span><h1>Audiencia y tráfico<span>.</span></h1><p>Una mirada a tus historias y a quienes las leen.</p></div>
      <div className="analytics-overview-side">
        <div className="analytics-controls">
          <button type="button" className="analytics-refresh" data-pending={refreshing} disabled={refreshing} onClick={() => startRefresh(() => router.refresh())} aria-label="Actualizar datos" title="Actualizar datos"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></svg></button>
          <nav className="analytics-period" aria-label="Periodo">{audiencePeriods.map(value => <Link key={value} href={`/mesa-editorial-7k4n/estadisticas?dias=${value}`} aria-current={value === period ? 'page' : undefined} scroll={false}>{value} días</Link>)}</nav>
        </div>
        <div className="analytics-live-badge"><span />DATOS REALES<span className="analytics-badge-period">{data.since ? `Portal publicado · desde el ${longDate(data.since)}` : 'Portal publicado · sin visitas todavía'}</span></div>
      </div>
    </header>

    {data.status === 'missing' && <p className="analytics-notice">{migrationNotice}</p>}
    {data.status === 'error' && <p className="analytics-notice" role="alert">No se pudieron leer los datos de audiencia. Recarga la página para reintentarlo.</p>}

    {data.status === 'ok' && <div className="analytics-grid">
      <Card index="01" title="Pulso de una noticia" subtitle="Alcance y evolución de una historia." control={article && <label className="analytics-select-label">Noticia<select autoComplete="off" value={article.id} onChange={event => setArticleId(event.target.value)}>{data.articles.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}>
        {article ? <>
          <div className="analytics-metrics"><Metric label="Vistas" value={number(sum(article.views))} hint={article.category} /><Metric label="Hoy" value={number(article.views[article.views.length - 1])} /><Metric label="Media diaria" value={number(Math.round(sum(article.views) / days.length))} /></div>
          <TrendChart key={`${article.id}-${period}`} days={days} views={article.views} color="#b9a0ff" title={`Vistas por día: ${article.title}`} />
        </> : <Empty>Ninguna noticia ha recibido visitas en los últimos {period} días.</Empty>}
      </Card>

      <Card index="02" title="Radiografía por categoría" subtitle="Toca una barra para ver el detalle de esa sección.">
        {category ? <>
          <div className="analytics-metrics"><Metric label={`Vistas de ${category.name}`} value={number(categoryTotal(category))} hint={`${percent(categoryTotal(category), total)} del portal`} /><Metric label="Noticias con visitas" value={`${number(category.articlesWithViews)} de ${number(category.published)}`} hint="publicadas" /><Metric label="Día con más vistas" value={bestDay ? bestDay.label : '—'} hint={bestDay ? `${number(bestDay.views)} vistas de noticias` : undefined} /></div>
          <div className="analytics-top" aria-live="polite">
            <h3>Las más vistas en {category.name.toLocaleLowerCase('es')}</h3>
            {category.topArticles.length > 0
              ? <ol>{category.topArticles.map(item => <li key={item.id}><span>{item.title}</span><strong>{number(item.views)}</strong></li>)}</ol>
              : <p>Ninguna noticia de esta categoría ha recibido visitas en los últimos {period} días.</p>}
            <small>Media de {number(Math.round(sum(category.articleViews) / days.length))} vistas diarias en sus noticias · {number(category.pageViews)} en su página de sección.</small>
          </div>
          <figure className="analytics-category-bars"><figcaption>Vistas acumuladas · Comparativa de secciones</figcaption>{data.categories.map(item => <button type="button" key={item.id} className="analytics-category-row" data-active={category.id === item.id} aria-pressed={category.id === item.id} onClick={() => setCategoryId(item.id)} style={{ '--category-color': item.color } as CSSProperties}><span className="analytics-category-line"><span>{item.name}</span><strong>{number(categoryTotal(item))}</strong></span><span className="analytics-bar-track"><span style={{ width: `${categoryTotal(item) / maxCategory * 100}%`, background: item.color }} /></span><small>{percent(categoryTotal(item), total)} del tráfico del portal</small></button>)}</figure>
        </> : <Empty>Todavía no hay categorías.</Empty>}
      </Card>

      <Card index="03" title="El portal, en perspectiva" subtitle="La evolución conjunta de todas tus páginas.">
        <div className="analytics-metrics"><Metric label="Vistas totales" value={number(total)} hint="Todas las páginas" /><Metric label="Visitas" value={hasSources ? number(visits) : '—'} /><Metric label="Páginas por visita" value={hasSources && visits ? (total / visits).toFixed(1).replace('.', ',') : '—'} /></div>
        <TrendChart key={`portal-${period}`} days={days} views={data.portalViews} secondary={hasSources ? data.portalVisits : undefined} secondaryLabel="Visitas" color="#78e3c3" title="Vistas y visitas diarias del portal" />
        <p className="analytics-footnote">Una visita empieza al entrar en el portal desde fuera. Sin cookies, la misma persona puede contar varias veces; no equivale a lectores únicos.</p>
      </Card>

      <Card index="04" title="De dónde llegan" subtitle="Canales que acercan nuevos lectores a tu periodismo.">
        {!hasSources ? <Empty>{data.sourcesStatus === 'missing' ? migrationNotice : 'No se pudo leer el origen de las visitas.'}</Empty>
          : visits === 0 ? <Empty>Aún no hay visitas registradas en los últimos {period} días.</Empty>
          : <>
            <div className="analytics-acquisition"><Donut sources={data.sources} total={visits} />
              <ul className="analytics-source-list">{data.sources.map(source => <li key={source.key}><span><i style={{ background: source.color }} />{source.name}</span><strong>{percent(source.visits, visits)}</strong></li>)}</ul></div>
            <div className="analytics-channel-insight"><span aria-hidden="true">↗</span><p><strong>{topSource.name} {topSource.key === 'directo' ? 'aporta' : 'aportan'} más visitas.</strong> {number(topSource.visits)} de {number(visits)} visitas ({percent(topSource.visits, visits)}) en los últimos {period} días.</p></div>
          </>}
      </Card>
    </div>}
  </div>;
}
