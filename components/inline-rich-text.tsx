'use client';

import { useEffect, useRef } from 'react';
import { EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { keymap } from '@tiptap/pm/keymap';
import { toggleMark } from '@tiptap/pm/commands';
import { history, undo, redo } from '@tiptap/pm/history';
import type { NewsDocument } from '@/lib/news-components';
import { inlineDocument, inlineSchema, inlineSpans } from '@/lib/inline-format';
import { newsTextLimit, useInlineNewsEditing } from './inline-news-editor';

export function InlineRichText({ value, path }: { value: NewsDocument; path: string[] }) {
  const editing = useInlineNewsEditing();
  const host = useRef<HTMLSpanElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({ editing, value, path });
  latest.current = { editing, value, path };
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (!host.current) return;
    let dirty = false;
    const editor = new EditorView({ mount: host.current }, {
      state: EditorState.create({ schema: inlineSchema, doc: inlineDocument(latest.current.value), plugins: [history(), keymap({
        'Mod-b': toggleMark(inlineSchema.marks.bold), 'Mod-i': toggleMark(inlineSchema.marks.italic),
        'Mod-u': toggleMark(inlineSchema.marks.underline), 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo,
        Enter: (state, dispatch) => { dispatch?.(state.tr.replaceSelectionWith(inlineSchema.nodes.hard_break.create()).scrollIntoView()); return true; },
      })] }),
      attributes: { role: 'textbox', 'aria-label': 'Texto', 'aria-multiline': 'true', class: 'inline-news-text inline-rich-text', 'data-placeholder': 'Escribir texto' },
      dispatchTransaction(transaction) {
        const current = latest.current;
        const limit = newsTextLimit([...current.path, 'texto'], current.editing?.news ?? {});
        if (transaction.docChanged && Array.from(transaction.doc.textBetween(0, transaction.doc.content.size, '\n', '\n')).length > limit) return;
        editor.updateState(editor.state.apply(transaction));
        if (transaction.docChanged) dirty = true;
      },
      handleDOMEvents: {
        click: (_, event) => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); return false; },
        blur: () => {
          if (!dirty) return false;
          dirty = false;
          const { editing, path } = latest.current;
          let block: unknown = editing?.news;
          for (const key of path) block = (block as NewsDocument)?.[key];
          editing?.change(path, { ...(block as NewsDocument), texto: editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n'), spans: inlineSpans(editor.state.doc) });
          return false;
        },
      },
    });
    view.current = editor;
    return () => { editor.destroy(); view.current = null; };
  }, []);
  useEffect(() => {
    const editor = view.current;
    const doc = inlineDocument(value);
    if (editor && !editor.hasFocus() && !editor.state.doc.eq(doc)) editor.updateState(EditorState.create({ schema: inlineSchema, doc, plugins: editor.state.plugins }));
  }, [serialized, value]);
  return <span ref={host} id={`news-field-${path.join('-')}-spans-0-texto`} />;
}
