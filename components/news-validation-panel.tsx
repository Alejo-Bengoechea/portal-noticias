'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { NewsValidationIssue } from '@/lib/news-validation';

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Interaction = { id: number; mode: 'move' | 'resize'; start: Point; rect: DOMRect };

const margin = 12;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function keepOnScreen(x: number, y: number, width: number, height: number): Point {
  return {
    x: clamp(x, margin, window.innerWidth - width - margin),
    y: clamp(y, margin, window.innerHeight - height - margin),
  };
}

export function NewsValidationPanel({ issues, saveError, attempt, onSelect }: {
  issues: NewsValidationIssue[];
  saveError: string;
  attempt: number;
  onSelect: (path: string[]) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const listId = useId();
  const headingId = useId();
  const [position, setPosition] = useState<Point | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [collapsedAt, setCollapsedAt] = useState<number | null>(null);
  const collapsed = collapsedAt === attempt;

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      setPosition(previous => {
        if (!previous) return previous;
        const next = keepOnScreen(previous.x, previous.y, width, height);
        return next.x === previous.x && next.y === previous.y ? previous : next;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener('resize', fit);
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  function adjust(mode: Interaction['mode'], rect: DOMRect, dx: number, dy: number) {
    if (mode === 'move') {
      setPosition(keepOnScreen(rect.left + dx, rect.top + dy, rect.width, rect.height));
      return;
    }
    const maxWidth = window.innerWidth - 2 * margin;
    const maxHeight = window.innerHeight - 2 * margin;
    const width = clamp(rect.width + dx, Math.min(240, maxWidth), maxWidth);
    const height = clamp(rect.height + dy, Math.min(145, maxHeight), maxHeight);
    setSize({ width, height });
    setPosition(keepOnScreen(rect.left, rect.top, width, height));
  }

  function start(event: PointerEvent<HTMLElement>, mode: Interaction['mode']) {
    const rect = panel.current?.getBoundingClientRect();
    if (!rect || event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = { id: event.pointerId, mode, start: { x: event.clientX, y: event.clientY }, rect };
  }

  function move(event: PointerEvent<HTMLElement>) {
    const current = interaction.current;
    if (current?.id === event.pointerId) {
      adjust(current.mode, current.rect, event.clientX - current.start.x, event.clientY - current.start.y);
    }
  }

  function stop(event: PointerEvent<HTMLElement>) {
    if (interaction.current?.id === event.pointerId) interaction.current = null;
  }

  function adjustWithKeys(event: KeyboardEvent<HTMLElement>, mode: Interaction['mode']) {
    const rect = panel.current?.getBoundingClientRect();
    const step = event.shiftKey ? 32 : 12;
    const directions: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const direction = directions[event.key];
    if (!rect || !direction) return;
    event.preventDefault();
    adjust(mode, rect, direction.x, direction.y);
  }

  return <aside ref={panel} className="news-validation-panel" aria-labelledby={headingId} data-collapsed={collapsed} data-resized={Boolean(size)}
    style={{
      left: position?.x, top: position?.y, right: position ? 'auto' : undefined, bottom: position ? 'auto' : undefined,
      width: size?.width, height: !collapsed ? size?.height : undefined,
    }}
    onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
    <header className="news-validation-panel-header" onPointerDown={event => {
      if (event.target instanceof Element && !event.target.closest('.validation-panel-toggle')) start(event, 'move');
    }}>
      <button className="validation-panel-drag" type="button"
        aria-label="Mover panel de errores con las flechas" title="Arrastra para mover el panel"
        onKeyDown={event => adjustWithKeys(event, 'move')}>
        <span aria-hidden="true">⠿</span>
      </button>
      <h2 id={headingId} role="status">{issues.length ? `${issues.length} ${issues.length === 1 ? 'error' : 'errores'} por revisar` : 'No se pudo guardar'}</h2>
      <button type="button" className="validation-panel-toggle" aria-controls={listId} aria-expanded={!collapsed}
        aria-label={collapsed ? 'Ampliar panel de errores' : 'Plegar panel de errores'}
        onClick={() => setCollapsedAt(collapsed ? null : attempt)}>{collapsed ? '+' : '−'}</button>
    </header>
    <div id={listId} className="validation-panel-content" hidden={collapsed}>
      {issues.length > 0 && <ul className="validation-checklist" aria-label="Errores de la noticia">
        {issues.map(issue => <li key={JSON.stringify([issue.path, issue.message])}>
          <button type="button" onClick={() => onSelect(issue.path)}>
            <span className="validation-checklist-box" aria-hidden="true" />
            <span>{issue.message}</span>
          </button>
        </li>)}
      </ul>}
      {saveError && <p role="alert">{saveError}</p>}
    </div>
    {!collapsed && <button type="button" className="validation-panel-resize" aria-label="Redimensionar panel con las flechas"
      title="Arrastra para cambiar el tamaño" onPointerDown={event => start(event, 'resize')}
      onKeyDown={event => adjustWithKeys(event, 'resize')}><span aria-hidden="true">◢</span></button>}
  </aside>;
}
