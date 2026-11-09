'use client';

import { startTransition, useActionState, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { saveArticle } from '@/app/mesa-editorial-7k4n/actions';
import type { Article, Term } from '@/lib/articles';
import { webUrl, youtubeId } from '@/lib/format';

export function ArticleForm({ article, categories, tags }: { article: Article | null; categories: Term[]; tags: Term[] }) {
  const [message, dispatch, pending] = useActionState(saveArticle, '');
  const [cover, setCover] = useState(article?.cover_url ?? '');
  const [mediaError, setMediaError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<'cover' | 'body'>('cover');
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }), Image, Youtube.configure({ nocookie: true })],
    content: article?.body ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    editorProps: { attributes: { class: 'rich editor-surface', 'aria-label': 'Cuerpo de la noticia', role: 'textbox', 'aria-multiline': 'true' } },
  });
  const active = useEditorState({ editor, selector: ({ editor }) => ({
    bold: editor?.isActive('bold'), italic: editor?.isActive('italic'), heading: editor?.isActive('heading', { level: 2 }),
    bullet: editor?.isActive('bulletList'), quote: editor?.isActive('blockquote'),
  }) });

  function chooseUpload(destination: 'cover' | 'body') {
    target.current = destination;
    fileInput.current?.click();
  }

  async function upload(file: File) {
    setMediaError('');
    if (file.size > 3 * 1024 * 1024) {
      setMediaError('La imagen supera los 3 MB.');
      return;
    }
    const destination = target.current;
    const alt = destination === 'body' ? window.prompt('Describe la imagen para lectores de pantalla:', '') : '';
    if (alt === null) return;
    const body = new FormData();
    body.set('file', file);
    setUploading(true);
    try {
      const response = await fetch('/mesa-editorial-7k4n/media', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'No se pudo subir la imagen.');
      if (destination === 'cover') setCover(result.url);
      else editor?.chain().focus().setImage({ src: result.url, alt }).run();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  }

  function insertVideo() {
    const input = window.prompt('URL del vídeo de YouTube');
    if (!input) return;
    const id = youtubeId(input);
    if (!id) {
      setMediaError('Introduce una URL válida de YouTube.');
      return;
    }
    setMediaError('');
    editor?.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` }).run();
  }

  function insertLink() {
    const input = window.prompt('URL del enlace. Déjala vacía para quitarlo.', editor?.getAttributes('link').href ?? '');
    if (input === null) return;
    if (!input) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const href = webUrl(input);
    if (!href) {
      setMediaError('Introduce un enlace HTTP o HTTPS válido.');
      return;
    }
    setMediaError('');
    editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  return <form autoComplete="off" className="stack panel" onSubmit={event => {
    event.preventDefault();
    if (!editor || pending || uploading) return;
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    form.set('body', JSON.stringify(editor.getJSON()));
    startTransition(() => dispatch(form));
  }}>
    <input autoComplete="off" type="hidden" name="id" value={article?.id ?? ''} />
    <label>Titular<input autoComplete="off" name="title" defaultValue={article?.title} maxLength={160} required /></label>
    <label>Subtítulo<textarea autoComplete="off" name="subtitle" defaultValue={article?.subtitle} maxLength={300} rows={2} /></label>
    <div className="admin-columns">
      <label>Firma<input autoComplete="off" name="author" defaultValue={article?.author ?? 'Alejo Bengoechea'} maxLength={100} required /></label>
      <label>Identificador en la URL<input autoComplete="off" name="slug" defaultValue={article?.slug} placeholder="Se genera a partir del titular" maxLength={180} /></label>
    </div>
    <label>Categoría<select name="category" required={Boolean(article?.published_at || article?.ever_published)} defaultValue={article?.category_id ?? ''}><option value="" disabled={Boolean(article?.published_at || article?.ever_published)}>Sin categoría (solo borrador)</option>
      {categories.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>
    {tags.length > 0 && <fieldset className="checks"><legend>Etiquetas</legend>{tags.map(term => <label key={term.id}><input autoComplete="off" type="checkbox" name="tags" value={term.id} defaultChecked={article?.tag_ids.includes(term.id)} />{term.name}</label>)}</fieldset>}
    <label className="check"><input autoComplete="off" name="featured" type="checkbox" defaultChecked={article?.featured} /> Destacar en portada</label>
    <div className="stack">
      <label>URL de la portada<input autoComplete="off" name="cover" type="url" value={cover} onChange={event => setCover(event.target.value)} /></label>
      <button className="secondary" type="button" disabled={uploading} onClick={() => chooseUpload('cover')}>Subir portada</button>
      {webUrl(cover) && <img className="cover-preview" src={cover} alt="Vista previa de la portada" />}
      <label>Texto alternativo de la portada<input autoComplete="off" name="coverAlt" defaultValue={article?.cover_alt} maxLength={250} /></label>
    </div>
    <input autoComplete="off" hidden ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) void upload(file);
    }} />
    <fieldset><legend>Cuerpo de la noticia</legend>
      <div className="toolbar" role="group" aria-label="Formato del texto">
        <button type="button" aria-pressed={!!active?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>Negrita</button>
        <button type="button" aria-pressed={!!active?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>Cursiva</button>
        <button type="button" aria-pressed={!!active?.heading} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>Encabezado</button>
        <button type="button" aria-pressed={!!active?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Lista</button>
        <button type="button" aria-pressed={!!active?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Cita</button>
        <button type="button" onClick={insertLink}>Enlace</button>
        <button type="button" disabled={uploading || !editor} onClick={() => chooseUpload('body')}>Imagen</button>
        <button type="button" onClick={insertVideo}>YouTube</button>
      </div>
      <EditorContent editor={editor} />
    </fieldset>
    <p role="status">{uploading ? 'Subiendo imagen…' : mediaError || message}</p>
    <div className="toolbar">
      <button name="intent" value="publish" disabled={pending || uploading || !editor}>{article?.published_at ? 'Actualizar publicación' : 'Publicar'}</button>
      <button className="secondary" name="intent" value="draft" disabled={pending || uploading || !editor}
        onClick={event => { if (article?.published_at && !window.confirm('¿Retirar la noticia del portal y guardarla como borrador?')) event.preventDefault(); }}>Guardar como borrador</button>
    </div>
  </form>;
}
