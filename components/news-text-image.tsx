'use client';

import type { ReactNode } from 'react';
import type { NewsDocument } from '@/lib/news-components';
import { InlineRichText } from './inline-rich-text';
import { useInlineNewsEditing } from './inline-news-editor';

export function NewsTextImage({ block, path, image, text }: { block: NewsDocument; path: string[]; image: ReactNode; text: ReactNode }) {
  const editing = useInlineNewsEditing();
  const right = block.ladoTexto === 'derecha';
  const copy = <div className="text-image-copy" key="text"><p>{editing ? <InlineRichText value={block} path={path} /> : text}</p></div>;
  const media = <div className="text-image-media" key="image">{image}</div>;
  return <section className="news-text-image">
    <div className="text-image-layout" data-editing={Boolean(editing)}>
      {right ? media : copy}
      {editing && <button type="button" className="text-image-swap" aria-label="Intercambiar texto e imagen" title="Intercambiar texto e imagen" onClick={() => editing.change([...path, 'ladoTexto'], right ? 'izquierda' : 'derecha')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" /></svg></button>}
      {right ? copy : media}
    </div>
  </section>;
}
