'use client';

import type { NewsDocument } from '@/lib/news-components';
import { InlineNewsText, useInlineNewsEditing } from './inline-news-editor';

export function NewsTable({ block, path }: { block: NewsDocument; path: string[] }) {
  const editing = useInlineNewsEditing();
  const columns = (Array.isArray(block.columnas) ? block.columnas : []) as { clave: string; etiqueta: string }[];
  const rows = (Array.isArray(block.filas) ? block.filas : []) as NewsDocument[];
  return <section className="news-data-table">
    <div className="preview-table"><table>
      <caption className="sr-only">{String(block.titulo || 'Datos de la noticia')}</caption>
      <thead><tr>{columns.map((column, i) => <th scope="col" key={column.clave}>
        <InlineNewsText path={[...path, 'columnas', String(i), 'etiqueta']} value={column.etiqueta} label={`Columna ${i + 1}`} />
        {editing && <button className="table-remove" type="button" aria-label={`Eliminar columna ${i + 1}`} disabled={columns.length <= 1} onClick={() => editing.change(path, {
          ...block, columnas: columns.filter((_, index) => index !== i),
          filas: rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== column.clave))),
        })}>×</button>}
      </th>)}{editing && <th className="table-row-action" scope="col"><span className="sr-only">Quitar fila</span></th>}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{columns.map((column, j) => <td key={column.clave}>
        <InlineNewsText path={[...path, 'filas', String(i), column.clave]} value={row[column.clave]} placeholder="Texto" label={`Fila ${i + 1}, columna ${j + 1}`} />
      </td>)}{editing && <td className="table-row-action"><button type="button" className="table-remove" aria-label={`Eliminar fila ${i + 1}`} disabled={rows.length <= 1}
        onClick={() => editing.change([...path, 'filas'], rows.filter((_, index) => index !== i))}>×</button></td>}</tr>)}</tbody>
    </table></div>
    {editing && <div className="table-edit-controls">
      <span>{rows.length} filas · {columns.length} columnas · Máximo 8 × 5</span>
      <button type="button" disabled={columns.length >= 5} onClick={() => {
        if (columns.length >= 5) return;
        const key = `col-${crypto.randomUUID()}`;
        editing.change(path, { ...block, columnas: [...columns, { clave: key, etiqueta: `Columna ${columns.length + 1}` }], filas: rows.map(row => ({ ...row, [key]: '' })) });
      }}>＋ Añadir columna</button>
      <button type="button" disabled={rows.length >= 8} onClick={() => { if (rows.length < 8) editing.change([...path, 'filas'], [...rows, Object.fromEntries(columns.map(column => [column.clave, '']))]); }}>＋ Añadir fila</button>
    </div>}
  </section>;
}
