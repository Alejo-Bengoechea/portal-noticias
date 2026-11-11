'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { parseNewsPreview } from './news-preview';
import { NewsComposer } from './news-composer';
import { createNewsDocument, type NewsDocument } from '@/lib/news-components';
import { validateNewsDocument } from '@/lib/news-validation';
import { saveNewsDocument } from '@/app/mesa-editorial-7k4n/actions';
import { NewsValidationPanel } from './news-validation-panel';

type IncomingNews = { name: string; news: ReturnType<typeof parseNewsPreview> };
type Preview = IncomingNews & { revision: number };
type EditingArticle = { draft?: boolean; id: string; name: string; news: NewsDocument };

export function JsonDropzone({ categories = [], article, drafts = [], draftsUnavailable = false }: {
  drafts?: { id: string; title: string }[];
  draftsUnavailable?: boolean;
  categories?: { id: string; name: string }[];
  article?: EditingArticle;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const highlight = useRef<Animation | null>(null);
  const draftPicker = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !draftPicker.current?.contains(event.target) && draftPicker.current) draftPicker.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && draftPicker.current?.open) { draftPicker.current.open = false; draftPicker.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, []);
  const input = useRef<HTMLInputElement>(null);
  const errorDialog = useRef<HTMLDialogElement>(null);
  const [jsonError, setJsonError] = useState('');
  useEffect(() => {
    if (jsonError && !errorDialog.current?.open) errorDialog.current?.showModal();
    if (!jsonError && errorDialog.current?.open) errorDialog.current.close();
  }, [jsonError]);
  const confirmation = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(() => article ? { name: article.name, news: article.news, revision: 1 } : null);
  const latest = useRef<Preview | null>(preview);
  const baseline = useRef(article ? JSON.stringify(article.news) : '');
  const [pending, setPending] = useState<IncomingNews | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [componentsMode, setComponentsMode] = useState(Boolean(article));
  const selectionVersion = useRef(0);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const issues = useMemo(() => showValidation && preview ? validateNewsDocument(preview.news, categories) : [], [showValidation, preview, categories]);
  const [saveIntent, setSaveIntent] = useState<'crear' | 'borrador' | null>(null);
  const [saveMessage, dispatchSave, saving] = useActionState(saveNewsDocument, '');
  const saveError = !saving && saveIntent ? saveMessage : '';

  useEffect(() => () => highlight.current?.cancel(), []);

  useEffect(() => {
    if (pending && !confirmation.current?.open) confirmation.current?.showModal();
    if (!pending && confirmation.current?.open) confirmation.current.close();
  }, [pending]);

  function openNews(next: IncomingNews) {
    baseline.current = JSON.stringify(next.news);
    const value = { ...next, revision: (latest.current?.revision ?? 0) + 1 };
    latest.current = value;
    setPreview(value);
    setComponentsMode(false);
    setPending(null);
    setError('');
    highlight.current?.cancel();
    setShowValidation(false);
    setSaveIntent(null);
  }
  function requestOpen(next: IncomingNews) {
    if (latest.current && JSON.stringify(latest.current.news) !== baseline.current) setPending(next);
    else openNews(next);
  }

  async function select(files: FileList | null) {
    if (pending || !files?.length) return;
    const candidate = files[0];
    if (files.length !== 1 || !/\.json$/i.test(candidate.name)) { setJsonError('Selecciona un solo archivo con extensión .json.'); return; }
    if (candidate.size > 2 * 1024 * 1024) { setJsonError('El archivo JSON supera los 2 MB.'); return; }
    setError(''); setLoading(true);
    const version = ++selectionVersion.current;
    try {
      const news = parseNewsPreview((await candidate.text()).replace(/^﻿/, ''));
      if (selectionVersion.current === version) requestOpen({ name: candidate.name, news });
    } catch (error) {
      if (selectionVersion.current === version) setJsonError(error instanceof Error ? error.message : 'No se pudo leer el JSON.');
    } finally { if (selectionVersion.current === version) setLoading(false); }
  }

  function jumpTo(path: string[]) {
    const root = editor.current;
    if (!root) return;
    const inBlock = path[0] === 'cuerpo' && path.length > 1;
    let target: HTMLElement | null = null;
    for (let length = path.length; length >= (inBlock ? 2 : 1) && !target; length--) {
      const id = CSS.escape(`news-field-${path.slice(0, length).join('-')}`);
      target = root.querySelector<HTMLElement>(`#${id}`);
    }
    if (!target && inBlock) target = root.querySelector<HTMLElement>(`[data-preview-block="${CSS.escape(path[1])}"]`);
    if (!target) return;

    highlight.current?.cancel();
    target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const red = { outline: '2px solid #ff687a', outlineOffset: '3px' };
    const clear = { outline: '2px solid transparent', outlineOffset: '3px' };
    const animation = target.animate(reducedMotion ? [red, red] : [red, clear, clear], {
      duration: reducedMotion ? 1300 : 480,
      iterations: reducedMotion ? 1 : 3,
    });
    highlight.current = animation;
    animation.onfinish = () => { if (highlight.current === animation) highlight.current = null; };
  }

  function attempt(action: 'crear' | 'borrador') {
    if (!preview || saving) return;
    const found = action === 'borrador' ? [] : validateNewsDocument(preview.news, categories, { requireCategory: true, requireCover: true });
    highlight.current?.cancel();
    setValidationAttempt(previous => previous + 1);
    setShowValidation(found.length > 0);
    if (found.length) { setSaveIntent(null); return; }
    const data = new FormData();
    data.set('id', article?.id ?? '');
    data.set('intent', action);
    data.set('document', JSON.stringify(preview.news));
    setSaveIntent(action);
    startTransition(() => dispatchSave(data));
  }

  const strictLabel = article && !article.draft ? 'Guardar cambios' : 'Crear';

  return <div ref={editor} className="news-import">
    <header className="news-editor-header"><div><p className="eyebrow accent">Creación editorial</p><h1>Editor de noticia</h1></div>
    </header>
    <input autoComplete="off" ref={input} hidden type="file" accept=".json,application/json" onChange={event => { select(event.currentTarget.files); event.currentTarget.value = ''; }} />
    <div className="news-import-controls" data-loaded={Boolean(preview)}>
        <div className="json-upload" data-compact={Boolean(preview)}>
          <button type="button" className="json-dropzone" data-dragging={dragging} disabled={loading}
            onClick={() => input.current?.click()}
            onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
            <svg aria-hidden="true" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v4h16v-4M12 16V4m-5 5 5-5 5 5" /></svg>
            <span>{preview ? (componentsMode ? 'Cargar un JSON' : 'Cambiar archivo JSON') : 'Arrastra un archivo JSON aquí'}</span>
            <span>{preview ? (componentsMode ? 'Arrastra o selecciona un archivo .json' : preview.name) : 'o haz clic para seleccionarlo'}</span>
          </button>
          <p className="json-upload-status" role="status">{error || (loading ? 'Preparando vista previa…' : '')}</p>
        </div>

      {preview && <div className="news-import-actions news-editor-top-actions" aria-label="Acciones superiores de la noticia">
      <button type="button" disabled={saving} onClick={() => attempt('crear')}>{saving && saveIntent === 'crear' ? 'Guardando…' : strictLabel}</button>
      <button type="button" disabled={saving} onClick={() => attempt('borrador')}>{saving && saveIntent === 'borrador' ? 'Guardando…' : 'Guardar borrador'}</button>
    </div>}
      <details ref={draftPicker} className="saved-drafts-picker"><summary>Abrir borrador <span aria-hidden="true">⌄</span></summary><nav aria-label="Borradores guardados">
        {drafts.length ? drafts.map(draft => <Link key={draft.id} href={`/mesa-editorial-7k4n/articulos/${draft.id}`} onClick={event => {
          if (latest.current && JSON.stringify(latest.current.news) !== baseline.current && !window.confirm('Tienes cambios sin guardar. ¿Abrir el borrador y descartarlos?')) event.preventDefault();
        }}>{draft.title}</Link>) : <p>{draftsUnavailable ? 'No se pudo cargar la lista de borradores.' : 'No hay borradores guardados.'}</p>}
        <Link href="/mesa-editorial-7k4n/borradores">Ver todos los borradores →</Link>
      </nav></details>
      {(!preview || !componentsMode) && <div className="news-create-alternative"><span>o</span><button type="button" disabled={loading} onClick={() => {
        selectionVersion.current += 1; setError('');
        if (!latest.current) {
          const value = { revision: 1, name: 'noticia-por-componentes.json', news: createNewsDocument() };
          baseline.current = JSON.stringify(value.news); latest.current = value; setPreview(value);
        }
        setComponentsMode(true);
      }}>Generar en componentes</button></div>}
    </div>
    {preview && (issues.length > 0 || saveError) && <NewsValidationPanel issues={issues} saveError={saveError}
      attempt={validationAttempt} onSelect={jumpTo} />}
    {preview && <NewsComposer key={preview.revision} showToolbar={false} categories={categories} news={preview.news} issues={issues}
      onChange={news => { const value = { ...preview, news }; latest.current = value; setPreview(value); }} />}
    {preview && <div className="news-import-actions news-preview-actions" aria-label="Acciones de la noticia">
      <button type="button" disabled={saving} onClick={() => attempt('crear')}>{saving && saveIntent === 'crear' ? 'Guardando…' : strictLabel}</button>
      <button type="button" disabled={saving} onClick={() => attempt('borrador')}>{saving && saveIntent === 'borrador' ? 'Guardando…' : 'Guardar borrador'}</button>
    </div>}
    {componentsMode && <p className="json-upload-status" role="status">{error || (loading ? 'Preparando JSON…' : '')}</p>}
    <dialog ref={errorDialog} className="category-confirm-dialog json-error-dialog" aria-labelledby="json-error-title" onCancel={() => setJsonError('')} onClose={() => setJsonError('')}>
      <h2 id="json-error-title">No se pudo abrir el JSON</h2><p>{jsonError}</p><p>Corrige el archivo y vuelve a cargarlo. Tu noticia actual no se ha modificado.</p>
      <button type="button" autoFocus onClick={() => setJsonError('')}>Entendido</button>
    </dialog>
    <dialog ref={confirmation} className="category-confirm-dialog json-replace-dialog" aria-labelledby="json-replace-title" onCancel={() => setPending(null)} onClose={() => setPending(null)}>
      <h2 id="json-replace-title">Tienes cambios en esta noticia</h2>
      <p>Abrir «{pending?.name}» reemplazará todo el contenido actual. Como no se guardan borradores en el navegador, se perderá si no lo guardas tú antes en un archivo.</p>
      <div className="json-replace-actions"><button className="json-replace-cancel" type="button" autoFocus onClick={() => setPending(null)}>Cancelar</button><button className="json-replace-discard" type="button" onClick={() => { if (pending) openNews(pending); }}>Reemplazar sin guardar</button></div>
    </dialog>
  </div>;
}
