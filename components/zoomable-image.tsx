'use client';

import { useRef } from 'react';

export function ZoomableImage({ src, alt, className, objectPosition }: { src: string; alt: string; className?: string; objectPosition?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button type="button" className="image-zoom-trigger" aria-label={alt ? `Ampliar imagen: ${alt}` : 'Ampliar imagen'} onClick={() => dialog.current?.showModal()}>
    <img src={src} alt={alt} className={className} style={{ objectPosition }} loading="lazy" referrerPolicy="no-referrer" /><span aria-hidden="true">⤢</span>
  </button><dialog ref={dialog} className="image-zoom-dialog" aria-label="Imagen ampliada" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <button type="button" autoFocus aria-label="Cerrar imagen ampliada" onClick={() => dialog.current?.close()}>×</button>
    <img src={src} alt={alt} referrerPolicy="no-referrer" />{alt && <p>{alt}</p>}
  </dialog></>;
}
