'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { analyticsDays, articleAnalytics, categoryAnalytics, portalReaders, portalViews, sum, trafficSources } from '@/lib/analytics-demo';

const number = (value: number) => new Intl.NumberFormat('es-ES').format(value);
const compact = (value: number) => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const duration = (value: number) => `${Math.floor(value / 60)} m ${value % 60} s`;

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="analytics-metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}
function Card({ index, title, subtitle, children, control, className = '' }: { index: string; title: string; subtitle: string; children: ReactNode; control?: ReactNode; className?: string }) {
  return <section className={`analytics-card ${className}`} aria-labelledby={`analytics-title-${index}`}>
    <header className="analytics-card-head"><div><h2 id={`analytics-title-${index}`}>{title}</h2><p>{subtitle}</p></div></header>
    {control}
    {children}
  </section>;
}

function TrendChart({ views, readers, color, title }: { views: number[]; readers?: number[]; color: string; title: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState<number | null>(null);
  const top = 18, bottom = 172, left = 44, right = 624;
  const max = Math.ceil(Math.max(...views, ...(readers ?? [])) / 100) * 100;
  const x = (i: number) => left + i * (right - left) / (views.length - 1);
  const y = (value: number) => bottom - value / max * (bottom - top);
  function curve(values: number[]) {
    return values.map((value, i) => i === 0 ? `M${x(i)},${y(value)}` : `C${(x(i - 1) + x(i)) / 2},${y(values[i - 1])} ${(x(i - 1) + x(i)) / 2},${y(value)} ${x(i)},${y(value)}`).join(' ');
  }
  return <figure className="analytics-trend">
    <svg viewBox="0 0 650 214" role="img" aria-label={title}>
      <title>{title}</title><desc>Serie simulada de siete días. Los valores se pueden consultar en la tabla inferior.</desc>
      <defs><linearGradient id={`analytics-fill-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".24" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map(fraction => <g key={fraction}><line x1={left} x2={right} y1={y(fraction * max)} y2={y(fraction * max)} stroke="#ffffff0c" strokeDasharray="3 5" /><text x={left - 10} y={y(fraction * max) + 4} textAnchor="end" className="analytics-axis">{compact(fraction * max)}</text></g>)}
      <path d={`${curve(views)} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#analytics-fill-${id})`} />
      {readers && <path d={curve(readers)} stroke="#79818e" strokeWidth="2" fill="none" strokeDasharray="5 5" />}
      <path d={curve(views)} stroke={color} strokeWidth="2.5" fill="none" />
      {active !== null && <line x1={x(active)} x2={x(active)} y1={top} y2={bottom} stroke={color} strokeOpacity=".5" strokeDasharray="3 4" />}
      {views.map((value, i) => <g key={i}><text x={x(i)} y="200" textAnchor="middle" className="analytics-axis">{analyticsDays[i]}</text><circle cx={x(i)} cy={y(value)} r={active === i ? 5 : 3} fill={color} />
        <circle className="analytics-chart-point" cx={x(i)} cy={y(value)} r="13" fill="transparent" tabIndex={0} aria-label={`${analyticsDays[i]}: ${number(value)} vistas${readers ? `, ${number(readers[i])} lectores` : ''}`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
      </g>)}
    </svg>
    <figcaption><span className="analytics-legend"><i style={{ background: color }} />Vistas{readers && <><i className="analytics-legend-secondary" />Lectores por día</>}</span><span className="analytics-point-value">{active !== null ? `${analyticsDays[active]} · ${number(views[active])} vistas` : 'Evolución de los últimos 7 días'}</span></figcaption>
    <details className="analytics-data"><summary>Ver datos</summary><div><table><caption className="sr-only">{title}</caption><thead><tr><th>Día</th><th>Vistas</th>{readers && <th>Lectores</th>}</tr></thead><tbody>{views.map((value, i) => <tr key={i}><th scope="row">{analyticsDays[i]}</th><td>{number(value)}</td>{readers && <td>{number(readers[i])}</td>}</tr>)}</tbody></table></div></details>
  </figure>;
}

export function AnalyticsDashboard() {
  const [articleId, setArticleId] = useState(articleAnalytics[0].id);
  const [categoryName, setCategoryName] = useState(categoryAnalytics[0].name);
  const article = articleAnalytics.find(item => item.id === articleId)!;
  const category = categoryAnalytics.find(item => item.name === categoryName)!;
  const total = sum(portalViews);
  const maxCategory = Math.max(...categoryAnalytics.map(item => sum(item.views)));
  let sourceOffset = 0;
  return <div className="analytics-dashboard">
    <header className="analytics-overview"><div><span className="analytics-kicker">OBSERVATORIO / 07 DÍAS</span><h1>Audiencia y tráfico<span>.</span></h1><p>Una mirada a tus historias y a quienes las leen.</p></div><div className="analytics-demo-badge"><span />DATOS SIMULADOS<span className="analytics-demo-period">Periodo ilustrativo de 7 días</span></div></header>
    <div className="analytics-grid">
      <Card index="01" title="Pulso de una noticia" subtitle="Alcance, lectura y evolución de una historia." control={<label className="analytics-select-label">Noticia<select autoComplete="off" value={articleId} onChange={event => setArticleId(event.target.value)}>{articleAnalytics.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}>
        <div className="analytics-metrics"><Metric label="Vistas" value={number(sum(article.views))} hint={article.category} /><Metric label="Tiempo de lectura" value={duration(article.readingSeconds)} /><Metric label="Lectura completa" value={`${article.completion}%`} /></div>
        <TrendChart key={article.id} views={article.views} readers={article.readers} color="#b9a0ff" title={`Vistas y lectores por día: ${article.title}`} />
      </Card>
      <Card index="02" title="Radiografía por categoría" subtitle="Compara el interés por cada sección." control={<label className="analytics-select-label">Categoría<select autoComplete="off" value={categoryName} onChange={event => setCategoryName(event.target.value)}>{categoryAnalytics.map(item => <option key={item.name}>{item.name}</option>)}</select></label>}>
        <div className="analytics-metrics"><Metric label="Vistas de la categoría" value={number(sum(category.views))} /><Metric label="Noticias" value={number(category.articles)} /><Metric label="Lectura completa" value={`${category.completion}%`} /></div>
        <figure className="analytics-category-bars"><figcaption>Vistas acumuladas · Comparativa de secciones</figcaption>{categoryAnalytics.map(item => <div key={item.name} className="analytics-category-row" data-active={category.name === item.name} style={{ '--category-color': item.color } as CSSProperties}><div><span>{item.name}</span><strong>{number(sum(item.views))}</strong></div><div className="analytics-bar-track"><div style={{ width: `${sum(item.views) / maxCategory * 100}%`, background: item.color }} /></div><small>{(sum(item.views) / total * 100).toFixed(1).replace('.', ',')}% del tráfico del portal</small></div>)}</figure>
        <p className="analytics-footnote">Promedio de lectura en {category.name.toLocaleLowerCase('es')}: <strong>{duration(category.readingSeconds)}</strong></p>
      </Card>
      <Card index="03" title="El portal, en perspectiva" subtitle="La evolución conjunta de todas tus secciones.">
        <div className="analytics-metrics"><Metric label="Vistas totales" value={number(total)} hint="Todas las categorías" /><Metric label="Sesiones" value="38.240" /><Metric label="Nuevos lectores" value="61%" /></div>
        <TrendChart views={portalViews} readers={portalReaders} color="#78e3c3" title="Vistas y lectores diarios del portal" />
        <p className="analytics-footnote">Un lector puede volver varios días; los lectores diarios no equivalen a usuarios únicos del periodo.</p>
      </Card>
      <Card index="04" title="De dónde llegan" subtitle="Canales que acercan nuevos lectores a tu periodismo.">
        <div className="analytics-acquisition"><figure className="analytics-donut"><svg viewBox="0 0 220 220" role="img" aria-label="Origen del tráfico: buscadores 42%, redes sociales 28%, acceso directo 18%, otras webs 12%"><circle cx="110" cy="110" r="82" fill="none" stroke="#353535" strokeWidth="17" />{trafficSources.map(source => {
          const offset = sourceOffset; sourceOffset += source.percentage;
          return <circle key={source.name} cx="110" cy="110" r="82" fill="none" stroke={source.color} strokeWidth="17" pathLength="100" strokeDasharray={`${source.percentage - 1.3} ${100 - source.percentage + 1.3}`} strokeDashoffset={-offset} transform="rotate(-90 110 110)" />;
        })}<text x="110" y="105" textAnchor="middle" className="analytics-donut-number">{compact(total)}</text><text x="110" y="128" textAnchor="middle" className="analytics-donut-label">VISTAS</text></svg><figcaption>Distribución del tráfico</figcaption></figure>
        <ul className="analytics-source-list">{trafficSources.map(source => <li key={source.name}><span><i style={{ background: source.color }} />{source.name}</span><strong>{source.percentage}%</strong></li>)}</ul></div>
        <div className="analytics-channel-insight"><span aria-hidden="true">↗</span><p><strong>Los buscadores abren la puerta.</strong> Aportan el 42% de las vistas en este escenario de muestra. Un canal útil para evaluar el alcance de tus titulares y contenidos.</p></div>
      </Card>
    </div>
  </div>;
}
