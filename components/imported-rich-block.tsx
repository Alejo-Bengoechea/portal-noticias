'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { RichText } from './rich-text';
import { useInlineNewsEditing } from './inline-news-editor';
import { webUrl } from '@/lib/format';

function safeContent(node: JSONContent, depth = 0): JSONContent {
  if (!node || depth > 40) return { type: 'paragraph' };
  const attrs = { ...node.attrs };
  if (node.type === 'image' || node.type === 'youtube') attrs.src = webUrl(attrs.src) ?? '';
  return { ...node, attrs, marks: Array.isArray(node.marks) ? node.marks.filter(mark => mark && (mark.type !== 'link' || webUrl(mark.attrs?.href))) : undefined,
    content: Array.isArray(node.content) ? node.content.map(child => safeContent(child, depth + 1)) : undefined };
}

function Editor({ content, path }: { content: JSONContent; path: string[] }) {
  const editing = useInlineNewsEditing();
  const latest = useRef({ editing, path });
  latest.current = { editing, path };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Image.configure({ allowBase64: false }), Youtube.configure({ nocookie: true })],
    content: safeContent(content),
    editorProps: { attributes: { class: 'imported-rich-editor', role: 'textbox', 'aria-label': 'Contenido importado', 'aria-multiline': 'true' } },
    onBlur: ({ editor }) => latest.current.editing?.change([...latest.current.path, 'contenido'], editor.getJSON()),
  });
  useEffect(() => {
    if (editor && !editor.isFocused && JSON.stringify(editor.getJSON()) !== JSON.stringify(safeContent(content))) editor.commands.setContent(safeContent(content), { emitUpdate: false });
  }, [editor, content]);
  return <EditorContent editor={editor} />;
}

export function ImportedRichBlock({ content, path }: { content: JSONContent; path: string[] }) {
  const editing = useInlineNewsEditing();
  return editing ? <Editor content={content} path={path} /> : <RichText body={content} />;
}
