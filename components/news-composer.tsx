'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NewsPreview } from './news-preview';
import { InlineNewsEditor } from './inline-news-editor';

import { componentTypes, createNewsBlock, emptyImage, moveNewsBlock, type ComponentType, type NewsBlock, type NewsDocument, type NewsResources } from '@/lib/news-components';
import type { NewsValidationIssue } from '@/lib/news-validation';

export function NewsComposer({ news, onChange, categories = [], showToolbar = true, issues = [] }: {
  news: NewsDocument; onChange: (news: NewsDocument) => void; categories?: { id: string; name: string }[]; showToolbar?: boolean; issues?: NewsValidationIssue[];
}) {
  const body = news.cuerpo as NewsBlock[];
  const resources = (news.recursos ?? {}) as NewsResources;
  const invalid = new Set(issues.map(issue => issue.path.join('.')));
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLElement>(null);
  const previousPositions = useRef<Map<string, number> | null>(null);
  const [stage, setStage] = useState<'palette' | null>(null);

  const [insertAt, setInsertAt] = useState(0);

  const [removed, setRemoved] = useState<{ block: NewsBlock; index: number } | null>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => {
    const before = previousPositions.current;
    previousPositions.current = null;
    if (!before) return;
    root.current?.querySelectorAll<HTMLElement>('[data-news-block]').forEach(element => {
      const previous = before.get(element.dataset.newsBlock!);
      if (previous === undefined) return;
      const distance = previous - element.getBoundingClientRect().top;
      if (Math.abs(distance) > 1) element.animate([{ transform: `translateY(${distance}px)`, opacity: .75 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.75,.25,1)' });
    });
  }, [body]);
  useEffect(() => {
    if (stage && !dialog.current?.open) dialog.current?.showModal();
    if (!stage && dialog.current?.open) dialog.current.close();
  }, [stage]);

  function update(next: NewsDocument) {
    const previousDates = news.fechas as NewsDocument;
    const nextDates = next.fechas as NewsDocument;
    const actualizacion = nextDates?.actualizacion !== previousDates?.actualizacion
      ? nextDates?.actualizacion : new Date().toISOString();
    onChange({ ...next, fechas: { ...nextDates, actualizacion } });
  }

  function add(index: number) {
    setInsertAt(index);

    setStage('palette');
  }

  function choose(type: ComponentType) {
    const created = createNewsBlock(type);
    const next = [...body];
    next.splice(Math.min(insertAt, next.length), 0, created.block);
    update({ ...news, cuerpo: next, recursos: { ...resources, ...created.resources } });
    setStage(null);
  }

  function move(index: number, direction: number) {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const elements = [...root.current?.querySelectorAll<HTMLElement>('[data-news-block]') ?? []];
      previousPositions.current = new Map(elements.map(element => [element.dataset.newsBlock!, element.getBoundingClientRect().top]));
      elements.forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
    }
    update({ ...news, cuerpo: moveNewsBlock(body, index, direction) });
  }

  function controls(block: NewsBlock, index: number) {
    const name = block.tipo === 'lista' && block.ordenada ? 'Lista numerada' : componentTypes.find(item => item.type === block.tipo)?.name ?? 'Componente';
    return <><div className="component-block-controls" role="group" aria-label={`Opciones de ${name} ${index + 1}`}>
      <button type="button" aria-label={`Subir ${name} ${index + 1}`} disabled={index === 0}
        onClick={() => move(index, -1)}>↑</button>
      <button type="button" aria-label={`Bajar ${name} ${index + 1}`} disabled={index === body.length - 1}
        onClick={() => move(index, 1)}>↓</button>
      <button type="button" onClick={() => {
        setRemoved({ block, index });
        update({ ...news, cuerpo: body.filter((_, position) => position !== index) });
      }}>Quitar</button>
    </div>
    <button className="component-insert-between component-insert-first" type="button" onClick={() => add(index)} aria-label={`Añadir componente antes de ${name} ${index + 1}`}>＋</button>{index < body.length - 1 && <button className="component-insert-between" type="button" onClick={() => add(index + 1)} aria-label={`Añadir componente después de ${name} ${index + 1}`}>＋</button>}</>;
  }

  return <section ref={root} className="news-composer">
    {showToolbar && <div className="composer-toolbar">
      <div><p className="eyebrow accent">Creación editorial</p><h1 ref={heading} tabIndex={-1}>Editor de noticia</h1></div>
    </div>}
    {removed && <div className="composer-undo" role="status">

      <button type="button" onClick={() => {
        const next = [...body];
        next.splice(Math.min(removed.index, next.length), 0, removed.block);
        update({ ...news, cuerpo: next });
        setRemoved(null);
      }}>Deshacer</button>
    </div>}
    <InlineNewsEditor news={news} onChange={update} categories={categories} invalid={invalid}>
      <NewsPreview news={news} blockControls={controls}
        addComponent={<div id="news-field-cuerpo" className="composer-add-row">
          <button type="button" onClick={() => add(body.length)}>＋ Añadir componente</button>
        </div>}
        onImageChange={(id, url) => update({
          ...news,
          portada: !news.portada && id === 'imagen-portada' ? { recursoId: id, pie: '' } : news.portada,
          recursos: { ...resources, [id]: { ...emptyImage(), ...resources[id], url } },
        })} />
    </InlineNewsEditor>
    <dialog ref={dialog} className="component-dialog" aria-labelledby="component-dialog-title"
      onCancel={() => setStage(null)} onClose={() => { if (!dialog.current?.open) setStage(null); }}>
      <div className="component-dialog-heading">
        <h2 id="component-dialog-title">Añadir componente</h2>
        <button type="button" aria-label="Cerrar selector de componentes" onClick={() => setStage(null)}>×</button>
      </div>
      {stage === 'palette' && ['Texto', 'Multimedia', 'Datos', 'Contexto'].map(group => <section key={group}>
        <h3>{group}</h3>
        <div className="component-palette">{componentTypes.filter(item => item.group === group).map(item =>
          <button key={item.type} type="button" onClick={() => choose(item.type)}><span aria-hidden="true">{item.symbol}</span>{item.name}</button>)}
        </div>
      </section>)}
    </dialog>
  </section>;
}


