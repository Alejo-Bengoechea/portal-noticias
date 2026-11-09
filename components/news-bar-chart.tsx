'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { NewsDocument } from '@/lib/news-components';
import { barChartDomain } from '@/lib/bar-chart';
import { InlineNewsText, useInlineNewsEditing } from './inline-news-editor';

type Point = { id: string; x: string; y: string };
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
function points(block: NewsDocument): Point[] {
  return (Array.isArray(block.datos) ? block.datos : []).filter(row => row && typeof row === 'object').map((row, i) => ({ id: text(row.id) || `dato-${i}`, x: text(row.x), y: text(row.y) }));
}
const format = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4, ...(Math.abs(value) >= 1000000 ? { notation: 'compact' as const } : {}) }).format(value);

export function NewsBarChart({ block, path }: { block: NewsDocument; path: string[] }) {
  const editing = useInlineNewsEditing();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const figure = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!figure.current) return;
    const element = figure.current;
    setCompact(element.clientWidth < 540);
    const observer = new ResizeObserver(entries => setCompact(entries[0].contentRect.width < 540));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => points(block));
  const [title, setTitle] = useState(text(block.titulo));
  const [unit, setUnit] = useState(text(block.unidad));
  const [source, setSource] = useState(text(block.fuente));
  const [description, setDescription] = useState(text(block.descripcionAccesible));
  const [error, setError] = useState('');
  const serialized = JSON.stringify(block);
  useEffect(() => {
    if (!open) { setRows(points(block)); setTitle(text(block.titulo)); setUnit(text(block.unidad)); setSource(text(block.fuente)); setDescription(text(block.descripcionAccesible)); setError(''); }
  }, [serialized, open]);
  const data = points(block).filter(row => row.y.trim() && Number.isFinite(Number(row.y)) && Math.abs(Number(row.y)) <= 1e12).map(row => ({ ...row, value: Number(row.y) }));
  const { min, max, ticks } = barChartDomain(data.map(row => row.value));
  const left = compact ? 20 : 190, width = compact ? 430 : 550, right = left + width;
  const x = (value: number) => left + (value - min) / (max - min) * width;
  const rowHeight = compact ? 88 : 54;
  const zero = x(0), bottom = 30 + data.length * rowHeight, height = bottom + 55;
  return <figure ref={figure} className="news-bar-chart" data-compact={compact}>
    <div className="chart-header"><div><span className="chart-kicker">DATOS / ANÁLISIS</span>
      <h3><InlineNewsText path={[...path, 'titulo']} value={block.titulo} label="Título del gráfico" /></h3>
      {text(block.descripcionAccesible) && <p>{text(block.descripcionAccesible)}</p>}
    </div>{editing && <button type="button" className="chart-edit-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Cerrar editor' : 'Editar datos'}</button>}</div>
    {editing && block.muestra === true && <p className="chart-sample">Datos de ejemplo. Sustitúyelos por los de tu noticia.</p>}
    {data.length !== points(block).length && <p className="chart-sample" role="alert">Hay datos fuera del rango válido. Revísalos antes de usar este gráfico.</p>}
    {editing && open && <form autoComplete="off" className="chart-data-form" onSubmit={event => {
      event.preventDefault();
      if (!rows.length || rows.some(row => !row.x.trim() || !row.y.trim() || !Number.isFinite(Number(row.y)) || Math.abs(Number(row.y)) > 1e12)) { setError('Cada dato necesita un nombre y un número válido, entre −1 billón y 1 billón.'); return; }
      if (!title.trim()) { setError('Escribe un título para el gráfico.'); return; }
      editing.change(path, { ...block, titulo: title.trim(), unidad: unit.trim(), fuente: source.trim(), descripcionAccesible: description.trim(), muestra: false, datos: rows.map(row => ({ id: row.id, x: row.x.trim(), y: Number(row.y) })) });
      setOpen(false);
    }}>
      <div className="chart-settings"><label>Título<input autoComplete="off" aria-label="Título del gráfico de barras" value={title} maxLength={120} required onChange={event => setTitle(event.target.value)} /></label>
        <label>Unidad (opcional)<input autoComplete="off" aria-label="Unidad del gráfico" value={unit} maxLength={20} placeholder="%, personas, millones…" onChange={event => setUnit(event.target.value)} /></label></div>
      <div className="chart-dataset"><div className="chart-data-labels"><span>Categoría</span><span>Valor</span><span /></div>
        {rows.map((row, i) => <div className="chart-data-row" key={row.id}>
          <input autoComplete="off" aria-label={`Categoría del dato ${i + 1}`} maxLength={80} value={row.x} required onChange={event => setRows(previous => previous.map((item, index) => index === i ? { ...item, x: event.target.value } : item))} />
          <input autoComplete="off" aria-label={`Valor del dato ${i + 1}`} type="number" step="any" min={-1e12} max={1e12} value={row.y} required onChange={event => setRows(previous => previous.map((item, index) => index === i ? { ...item, y: event.target.value } : item))} />
          <button type="button" aria-label={`Eliminar dato ${i + 1}`} disabled={rows.length <= 1} onClick={() => setRows(previous => previous.filter((_, index) => index !== i))}>×</button>
        </div>)}
      </div>
      <button className="chart-add-row" type="button" disabled={rows.length >= 30} onClick={() => setRows(previous => [...previous, { id: crypto.randomUUID(), x: 'Nueva categoría', y: '0' }])}>＋ Añadir dato</button>
      <label>Descripción (opcional)<textarea autoComplete="off" aria-label="Descripción del gráfico" value={description} rows={2} maxLength={300} onChange={event => setDescription(event.target.value)} /></label>
      <label>Fuente (opcional)<input autoComplete="off" aria-label="Fuente del gráfico" value={source} maxLength={180} placeholder="Institución o documento de origen" onChange={event => setSource(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="chart-form-actions"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button type="submit">Aplicar datos</button></div>
    </form>}
    <div className="chart-unit">{text(block.unidad) || 'Valores'}</div>
    {data.length ? <svg className="bar-chart-svg" viewBox={`0 0 ${compact ? 560 : 900} ${height}`} role="img" aria-labelledby={`${uid}-title ${uid}-description`}>
      <title id={`${uid}-title`}>{text(block.titulo)}</title>
      <desc id={`${uid}-description`}>{text(block.descripcionAccesible)} {data.map(row => `${row.x}: ${row.value} ${text(block.unidad)}`).join('; ')}</desc>
      <defs><linearGradient id={`${uid}-bar`} x1="0" x2="1" y1="0" y2="0"><stop stopColor="#a63f56" /><stop offset="1" stopColor="#ec8395" /></linearGradient></defs>
      {ticks.map(tick => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="10" y2={bottom} stroke={tick === 0 ? '#738396' : '#303c4c'} strokeDasharray={tick === 0 ? undefined : '3 5'} /><text x={x(tick)} y={bottom + 28} textAnchor="middle" className="chart-tick">{format(tick)}</text></g>)}
      {data.map((row, i) => <g key={row.id}>
        <text x={compact ? left : left - 18} y={(compact ? 22 : 43) + i * rowHeight} textAnchor={compact ? 'start' : 'end'} className="chart-label"><title>{row.x}</title>{row.x.length > 23 ? `${row.x.slice(0, 22)}…` : row.x}</text>
        <rect x={left} y={(compact ? 37 : 23) + i * rowHeight} width={width} height={compact ? 34 : 28} rx="5" fill="#ffffff03" />
        <rect x={Math.min(zero, x(row.value))} y={(compact ? 37 : 23) + i * rowHeight} width={Math.abs(x(row.value) - zero)} height={compact ? 34 : 28} rx="5" fill={`url(#${uid}-bar)`}><title>{row.x}: {row.value} {text(block.unidad)}</title></rect>
        <text x={compact ? right + 80 : right + 120} y={(compact ? 63 : 43) + i * rowHeight} textAnchor="end" className="chart-value">{format(row.value)}</text>
      </g>)}
    </svg> : <p className="chart-empty">Añade datos para mostrar el gráfico.</p>}
    {text(block.fuente) && <figcaption className="chart-source">Fuente: {text(block.fuente)}</figcaption>}
  </figure>;
}
