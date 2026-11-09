import type { JSONContent } from '@tiptap/react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { ZoomableImage } from './zoomable-image';
import { webUrl, youtubeId } from '@/lib/format';

function render(node: JSONContent, depth = 0): ReactNode {
  if (!node || depth > 40) return null;
  const children = Array.isArray(node.content) ? node.content.map((child, i) => <Fragment key={i}>{render(child, depth + 1)}</Fragment>) : null;
  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return <p>{children}</p>;
    case 'heading': {
      const Tag = node.attrs?.level === 3 ? 'h3' : 'h2';
      return <Tag>{children}</Tag>;
    }
    case 'bulletList': return <ul>{children}</ul>;
    case 'orderedList': return <ol>{children}</ol>;
    case 'listItem': return <li>{children}</li>;
    case 'blockquote': return <blockquote>{children}</blockquote>;
    case 'codeBlock': return <pre>{children}</pre>;
    case 'hardBreak': return <br />;
    case 'horizontalRule': return <hr />;
    case 'image': {
      const src = webUrl(node.attrs?.src);
      return src && <ZoomableImage src={src} alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''} />;
    }
    case 'youtube': {
      const id = youtubeId(node.attrs?.src);
      return id && <iframe className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${id}`}
        title="Vídeo de YouTube" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
    }
    case 'text': {
      let value: ReactNode = typeof node.text === 'string' ? node.text : null;
      for (const mark of Array.isArray(node.marks) ? node.marks : []) {
        switch (mark?.type) {
          case 'bold': value = <strong>{value}</strong>; break;
          case 'italic': value = <em>{value}</em>; break;
          case 'strike': value = <s>{value}</s>; break;
          case 'underline': value = <u>{value}</u>; break;
          case 'code': value = <code>{value}</code>; break;
          case 'link': {
            const href = webUrl(mark.attrs?.href);
            if (href) value = <a href={href} rel="noopener noreferrer">{value}</a>;
          }
        }
      }
      return value;
    }
    default: return null;
  }
}

export function RichText({ body }: { body: JSONContent }) {
  return <div className="rich">{render(body)}</div>;
}
