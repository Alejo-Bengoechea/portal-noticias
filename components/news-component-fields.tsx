'use client';

import { emptyImage, type NewsBlock, type NewsResources } from '@/lib/news-components';
import { newsTextLimit } from './inline-news-editor';

const labels: Record<string, string> = {
  titulo: 'Título', texto: 'Texto', spans: 'Fragmentos de texto', marcas: 'Formato', enlace: 'Enlace', href: 'Dirección del enlace', retratoUrl: 'Retrato de la fuente (URL opcional)',
  nivel: 'Nivel del subtítulo', pie: 'Pie de imagen', url: 'URL', alt: 'Descripción de la imagen', credito: 'Crédito',
  elementos: 'Elementos', ordenada: 'Lista numerada', atribucion: 'Autoría de la cita', valor: 'Valor', unidad: 'Unidad',
  etiqueta: 'Descripción', descripcionAccesible: 'Descripción del gráfico', datos: 'Datos', x: 'Etiqueta', y: 'Valor',
  eventos: 'Acontecimientos', fecha: 'Fecha', pregunta: 'Pregunta', opciones: 'Respuestas', icono: 'Icono', color: 'Color',
  paginas: 'Número de páginas', alternativa: 'Contenido alternativo', transcripcionUrl: 'URL de la transcripción',
};
const hidden = new Set(['id', 'tipo', 'clave', 'proveedor', 'modo', 'activa', 'variante', 'fuenteId', 'bloqueOrigenId', 'tablaAlternativaId', 'urlEmbed', 'tipoDato']);
const choices: Record<string, { value: string; label: string }[]> = {
  icono: [{ value: 'info', label: 'Información' }, { value: 'aviso', label: 'Aviso' }, { value: 'verificado', label: 'Verificado' }],
  color: [{ value: 'rojo', label: 'Rojo' }, { value: 'ambar', label: 'Ámbar' }, { value: 'verde', label: 'Verde' }],
};

function resetItem(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(resetItem);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key, key === 'id' ? crypto.randomUUID() : key === 'marcas' ? [] : resetItem(child),
  ]));
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  return '';
}

function TableFields({ block, onChange }: { block: NewsBlock; onChange: (block: NewsBlock) => void }) {
  const columns = block.columnas as { clave: string; etiqueta: string }[];
  const rows = block.filas as Record<string, string | number>[];
  return <fieldset className="component-table-editor">
    <legend>Contenido de la tabla</legend>
    <div className="preview-table"><table>
      <thead><tr>{columns.map((column, i) => <th key={column.clave}>
        <input autoComplete="off" maxLength={120} aria-label={`Nombre de columna ${i + 1}`} value={column.etiqueta} onChange={event =>
          onChange({ ...block, columnas: columns.map((item, index) => index === i ? { ...item, etiqueta: event.target.value } : item) })} />
        <button type="button" disabled={columns.length === 1} onClick={() => onChange({ ...block,
          columnas: columns.filter((_, index) => index !== i),
          filas: rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== column.clave))),
        })}>Quitar columna</button>
      </th>)}<th scope="col">Fila</th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>
        {columns.map(column => <td key={column.clave}><input autoComplete="off" maxLength={3000} aria-label={`Fila ${i + 1}, ${column.etiqueta}`}
          value={row[column.clave] ?? ''} onChange={event => onChange({ ...block,
            filas: rows.map((item, index) => index === i ? { ...item, [column.clave]: event.target.value } : item),
          })} /></td>)}
        <td><button type="button" disabled={rows.length === 1} onClick={() => onChange({ ...block, filas: rows.filter((_, index) => index !== i) })}>Quitar fila</button></td>
      </tr>)}</tbody>
    </table></div>
    <div className="toolbar">
      <button type="button" onClick={() => {
        const clave = `col-${crypto.randomUUID()}`;
        onChange({ ...block, columnas: [...columns, { clave, etiqueta: `Columna ${columns.length + 1}` }], filas: rows.map(row => ({ ...row, [clave]: '' })) });
      }}>Añadir columna</button>
      <button type="button" onClick={() => onChange({ ...block, filas: [...rows, Object.fromEntries(columns.map(column => [column.clave, '']))] })}>Añadir fila</button>
    </div>
  </fieldset>;
}

export function NewsComponentFields({ block, resources, onChange }: {
  block: NewsBlock; resources: NewsResources; onChange: (block: NewsBlock, resources: NewsResources) => void;
}) {
  function renderValue(key: string, value: unknown, update: (value: unknown) => void, depth: number): React.ReactNode {
    if (hidden.has(key) || depth > 8) return null;
    const label = labels[key] ?? key;
    if (key === 'recursoId' && typeof value === 'string') {
      const image = resources[value] ?? emptyImage();
      return <fieldset className="component-field-group"><legend>Imagen</legend>
        {['url', 'alt', 'credito'].map(property => <label key={property}>{labels[property]}
          <input autoComplete="off" maxLength={property === 'url' ? 2048 : property === 'credito' ? 100 : 300} type={property === 'url' ? 'url' : 'text'} value={String(image[property as keyof typeof image] ?? '')}
            onChange={event => onChange(block, { ...resources, [value]: { ...image, [property]: event.target.value } })} />
        </label>)}
      </fieldset>;
    }
    if (key === 'nivel') return <label>{label}<select value={String(value)} onChange={event => update(Number(event.target.value))}>
      <option value="2">Principal (H2)</option><option value="3">Secundario (H3)</option><option value="4">Detalle (H4)</option>
    </select></label>;
    if (choices[key]) return <label>{label}<select value={String(value)} onChange={event => update(event.target.value)}>
      {choices[key].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>;
    if (key === 'marcas') {
      const marks = Array.isArray(value) ? value as string[] : [];
      return <fieldset className="checks"><legend>Formato</legend>
        {[['negrita', 'Negrita'], ['cursiva', 'Cursiva'], ['subrayado', 'Subrayado']].map(([mark, name]) =>
          <label key={mark}><input autoComplete="off" type="checkbox" checked={marks.includes(mark)}
            onChange={() => update(marks.includes(mark) ? marks.filter(item => item !== mark) : [...marks, mark])} />{name}</label>)}
      </fieldset>;
    }
    if (Array.isArray(value)) return <fieldset className="component-field-group">
      <legend>{label}</legend>
      {value.map((item, i) => <div className="component-repeated-item" key={i}>
        {renderValue('Elemento', item, next => update(value.map((previous, index) => index === i ? next : previous)), depth + 1)}
        <button type="button" disabled={value.length === 1} onClick={() => update(value.filter((_, index) => index !== i))}>Quitar elemento {i + 1}</button>
      </div>)}
      <button type="button" onClick={() => {
        if (block.tipo === 'galeria' && key === 'elementos') {
          const id = `imagen-${crypto.randomUUID()}`;
          onChange({ ...block, elementos: [...value, { recursoId: id, pie: '' }] }, { ...resources, [id]: emptyImage() });
          return;
        }
        update([...value, resetItem(value[0] ?? '')]);
      }}>Añadir elemento</button>
    </fieldset>;
    if (value && typeof value === 'object') return <div className="component-nested-fields">
      {Object.entries(value).map(([property, child]) => <div key={property}>
        {renderValue(property, child, next => update({ ...value, [property]: next }), depth + 1)}
      </div>)}
    </div>;
    if (typeof value === 'boolean') return <label className="check"><input autoComplete="off" type="checkbox" checked={value} onChange={event => update(event.target.checked)} />{label}</label>;
    if (typeof value === 'number') return <label>{label}<input autoComplete="off" type="number" step="any" value={value} onChange={event => update(Number(event.target.value))} /></label>;
    if (typeof value !== 'string') return null;
    const limit = newsTextLimit(['cuerpo', '0', key], { cuerpo: [block] });
    if (['texto', 'descripcionAccesible', 'atribucion'].includes(key)) return <label>{label}<textarea autoComplete="off" maxLength={limit} title={`Máximo ${limit} caracteres`} value={value} rows={key === 'texto' ? 4 : 2} onChange={event => update(event.target.value)} /></label>;
    const type = key === 'fecha' ? 'date' : key === 'url' || key === 'transcripcionUrl' || key === 'retratoUrl' ? 'url' : 'text';
    return <label>{label}<input autoComplete="off" maxLength={type === 'url' || key === 'href' ? 2048 : limit} type={type} value={type === 'date' ? value.slice(0, 10) : value}
      onChange={event => update(type === 'date' ? event.target.value + value.slice(10) : event.target.value)} /></label>;
  }

  return <div className="stack component-fields">
    {Object.entries(block).filter(([key]) => block.tipo !== 'tabla' || !['columnas', 'filas'].includes(key)).map(([key, value]) =>
      <div key={key}>{renderValue(key, value, next => onChange({ ...block, [key]: next }, resources), 0)}</div>)}
    {block.tipo === 'tabla' && <TableFields block={block} onChange={next => onChange(next, resources)} />}
  </div>;
}
