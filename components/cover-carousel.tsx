'use client';

import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const interval = 5000;

// Muestra una portada a la vez y pasa a la siguiente cada 5 segundos.
// Se detiene al navegar con teclado dentro, con la pestaña oculta o con el botón de pausa.
export function CoverCarousel({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hosts, setHosts] = useState<HTMLElement[]>([]);
  const track = useRef<HTMLDivElement>(null);
  const remaining = useRef(interval);
  const started = useRef(0);
  const stopped = paused || focus || hidden;

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  // Los controles se colocan bajo «Leer el artículo» de cada portada.
  useLayoutEffect(() => {
    const created = [...(track.current?.querySelectorAll('.hero-copy') ?? [])].map(copy => {
      const host = document.createElement('div');
      host.className = 'cover-carousel-controls';
      copy.append(host);
      return host;
    });
    setHosts(created);
    return () => created.forEach(host => host.remove());
  }, [count]);
  useEffect(() => { remaining.current = interval; }, [index]);
  useEffect(() => {
    if (count < 2 || stopped) return;
    started.current = Date.now();
    const timer = setTimeout(() => setIndex(current => (current + 1) % count), Math.max(remaining.current, 0));
    return () => { clearTimeout(timer); remaining.current -= Date.now() - started.current; };
  }, [index, count, stopped]);

  const controls = <>
    <button type="button" className="cover-carousel-pause" aria-pressed={paused} aria-label={paused ? 'Reanudar el cambio automático de portadas' : 'Pausar el cambio automático de portadas'}
      onClick={() => setPaused(value => !value)}>{paused ? '▶' : '❚❚'}</button>
    {slides.map((_, i) => <button type="button" key={i} className="cover-carousel-dot" aria-label={`Ver portada ${i + 1} de ${count}`} aria-current={i === index}
      onClick={() => setIndex(i)}><span key={i === index ? `on-${index}` : 'off'} /></button>)}
  </>;

  if (count < 2) return <>{children}</>;
  return <div className={`cover-carousel${stopped ? ' is-stopped' : ''}`} role="region" aria-roledescription="carrusel" aria-label={label}
    onFocus={event => setFocus(event.target.matches(':focus-visible'))}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}>
    <div ref={track} className="cover-carousel-track" aria-live={paused ? 'polite' : 'off'}>
      {slides.map((slide, i) => <div key={i} className={`cover-slide${i === index ? ' is-active' : ''}`} role="group" aria-roledescription="diapositiva"
        aria-label={`${i + 1} de ${count}`} aria-hidden={i !== index} inert={i !== index}>{slide}</div>)}
    </div>
    {hosts.map((host, h) => createPortal(controls, host, `controls-${h}`))}
  </div>;
}
