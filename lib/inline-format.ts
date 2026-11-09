import { Schema, DOMParser, type Node as TextNode } from '@tiptap/pm/model';
import type { NewsDocument } from './news-components';
import { webUrl } from './format';

export const inlineSchema = new Schema({
  nodes: {
    doc: { content: 'inline*' },
    text: { group: 'inline' },
    hard_break: { inline: true, group: 'inline', selectable: false, parseDOM: [{ tag: 'br' }], toDOM: () => ['br'] },
  },
  marks: {
    bold: { parseDOM: [{ tag: 'strong' }, { tag: 'b' }], toDOM: () => ['strong', 0] },
    italic: { parseDOM: [{ tag: 'em' }, { tag: 'i' }], toDOM: () => ['em', 0] },
    underline: { parseDOM: [{ tag: 'u' }], toDOM: () => ['u', 0] },
    link: { attrs: { href: {} }, inclusive: false,
      parseDOM: [{ tag: 'a[href]', getAttrs: node => { const href = webUrl((node as HTMLElement).getAttribute('href')); return href ? { href } : false; } }],
      toDOM: mark => ['a', { href: mark.attrs.href, rel: 'noreferrer' }, 0] },
  },
});
const marks: Record<string, string> = { negrita: 'bold', cursiva: 'italic', subrayado: 'underline' };

export function inlineDocument(value: NewsDocument) {
  const spans = Array.isArray(value.spans) ? value.spans as NewsDocument[] : [{ texto: String(value.texto ?? '') }];
  const content: TextNode[] = [];
  for (const span of spans) {
    const styles = (Array.isArray(span.marcas) ? span.marcas : []).flatMap(mark => marks[String(mark)] ? [inlineSchema.marks[marks[String(mark)]].create()] : []);
    const href = webUrl((span.enlace as NewsDocument | undefined)?.href);
    if (href) styles.push(inlineSchema.marks.link.create({ href }));
    String(span.texto ?? '').split('\n').forEach((text, i) => {
      if (i) content.push(inlineSchema.nodes.hard_break.create());
      if (text) content.push(inlineSchema.text(text, styles));
    });
  }
  return inlineSchema.nodes.doc.create(null, content);
}

export function inlineSpans(doc: TextNode): NewsDocument[] {
  const spans: NewsDocument[] = [];
  doc.forEach(node => {
    const styles = Object.entries(marks).filter(([, name]) => node.marks.some(mark => mark.type.name === name)).map(([name]) => name);
    const href = node.marks.find(mark => mark.type.name === 'link')?.attrs.href ?? '';
    const text = node.type.name === 'hard_break' ? '\n' : node.text ?? '';
    const previous = spans.at(-1);
    if (previous && JSON.stringify(previous.marcas) === JSON.stringify(styles) && (previous.enlace as NewsDocument)?.href === href) previous.texto = String(previous.texto ?? '') + text;
    else spans.push({ texto: text, marcas: styles, enlace: { href } });
  });
  return spans;
}

export function inlineSpansFromDOM(element: HTMLElement) {
  return inlineSpans(DOMParser.fromSchema(inlineSchema).parse(element));
}
