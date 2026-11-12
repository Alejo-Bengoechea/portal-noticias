'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import styles from './social-dashboard.module.css';

const platforms = [
  { name: 'X', color: '#c9cdd5', followers: 1680, gained: 64, views: [7200, 8900, 10500, 9400], interactions: 822, posts: 14 },
  { name: 'YouTube', color: '#ff8588', followers: 3240, gained: 185, views: [9200, 10400, 12300, 16600], interactions: 1860, posts: 5 },
  { name: 'TikTok', color: '#7addcc', followers: 7460, gained: 480, views: [18200, 24800, 22100, 30600], interactions: 5910, posts: 12 },
];

const number = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
const percent = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 });
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const totals = (key: 'followers' | 'gained' | 'interactions' | 'posts') => sum(platforms.map(platform => platform[key]));
const weeks = platforms[0].views.map((_, index) => sum(platforms.map(platform => platform.views[index])));
const maxViews = Math.max(...weeks);

export function SocialDashboard() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(platforms[0]);
  const metrics = [
    ['Seguidores y suscriptores', totals('followers')],
    ['Nuevos seguidores netos', totals('gained')],
    ['Visualizaciones', sum(weeks)],
    ['Interacciones', totals('interactions')],
  ] as const;

  return <div className={styles.dashboard}>
    <header className={styles.heading}>
      <h1>Redes Sociales</h1>
    </header>
    <section className={styles.panel} aria-labelledby="social-instagram">
      <div className={styles.heading}>
        <div><h2 id="social-instagram">Instagram</h2><p>@alejobengo · Resumen, contenido y audiencia</p></div>
        <Link prefetch={false} className={styles.platformLink} href="/mesa-editorial-7k4n/redes-sociales/instagram">Ver estadísticas <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
    <div className={styles.heading}>
      <div><h2>Resumen de X, YouTube y TikTok</h2><p>Rendimiento de cuatro semanas.</p></div>
      <span className={styles.sample}>Datos de ejemplo</span>
    </div>

    <dl className={styles.metrics}>
      {metrics.map(([label, value]) => <div className={styles.panel} key={label}>
        <dt>{label}</dt><dd>{number.format(value)}</dd>
      </div>)}
    </dl>

    <section className={styles.panel} aria-labelledby="social-trend">
      <h2 id="social-trend">Visualizaciones por semana</h2>
      <ul className={styles.legend} aria-label="Plataformas">
        {platforms.map(platform => <li key={platform.name}>
          <i style={{ background: platform.color }} aria-hidden="true" />{platform.name}
        </li>)}
      </ul>
      <ol className={styles.chart}>
        {weeks.map((value, index) => <li key={index}>
          <span>Semana {index + 1}</span>
          <div className={styles.track} aria-hidden="true">
            {platforms.map(platform => <i key={platform.name} style={{ width: `${platform.views[index] / maxViews * 100}%`, background: platform.color }} />)}
          </div>
          <strong>{number.format(value)}</strong>
        </li>)}
      </ol>
    </section>

    <section aria-labelledby="social-platforms">
      <h2 id="social-platforms">Rendimiento por red</h2>
      <div className={styles.platforms}>
        {platforms.map(platform => <article className={styles.panel} key={platform.name}>
          <h3><i style={{ background: platform.color }} aria-hidden="true" />{platform.name}</h3>
          <dl className={styles.breakdown}>
            <div><dt>Seguidores</dt><dd>{number.format(platform.followers)}</dd></div>
            <div><dt>Visualizaciones</dt><dd>{number.format(sum(platform.views))}</dd></div>
            <div><dt>Interacciones</dt><dd>{number.format(platform.interactions)}</dd></div>
          </dl>
          <button type="button" aria-haspopup="dialog" aria-label={`Ver detalle de ${platform.name}`} onClick={() => {
            flushSync(() => setSelected(platform));
            dialog.current?.showModal();
          }}>Ver detalle <span aria-hidden="true">↗</span></button>
        </article>)}
      </div>
    </section>

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="social-detail">
      <header className={styles.heading}>
        <div><h2 id="social-detail">Detalle de {selected.name}</h2><p>Cuatro semanas · Datos de ejemplo</p></div>
        <form method="dialog"><button type="submit">Cerrar</button></form>
      </header>
      <dl className={styles.breakdown}>
        <div><dt>Nuevos seguidores netos</dt><dd>+{number.format(selected.gained)}</dd></div>
        <div><dt>Publicaciones</dt><dd>{number.format(selected.posts)}</dd></div>
        <div><dt>Interacciones por visualización</dt><dd>{percent.format(selected.interactions / sum(selected.views))}</dd></div>
      </dl>
      <table>
        <caption>Visualizaciones semanales</caption>
        <thead><tr><th scope="col">Periodo</th><th scope="col">Visualizaciones</th></tr></thead>
        <tbody>{selected.views.map((value, index) => <tr key={index}>
          <th scope="row">Semana {index + 1}</th><td>{number.format(value)}</td>
        </tr>)}</tbody>
      </table>
    </dialog>
  </div>;
}
