'use client';

import { useEffect, useRef, useState } from 'react';
import { parseNewsPreview } from './news-preview';
import { NewsComposer } from './news-composer';
import { createNewsDocument } from '@/lib/news-components';
import { validateNewsDocument, type NewsValidationIssue } from '@/lib/news-validation';

type IncomingNews = { name: string; news: ReturnType<typeof parseNewsPreview> };
type Preview = IncomingNews & { revision: number };

export function JsonDropzone({ categories = [] }: { categories?: { id: string; name: string }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const errorDialog = useRef<HTMLDialogElement>(null);
  const [jsonError, setJsonError] = useState('');
  useEffect(() => {
    if (jsonError && !errorDialog.current?.open) errorDialog.current?.showModal();
    if (!jsonError && errorDialog.current?.open) errorDialog.current.close();
  }, [jsonError]);
  const confirmation = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const latest = useRef<Preview | null>(null);
  const baseline = useRef('');
  const [pending, setPending] = useState<IncomingNews | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [componentsMode, setComponentsMode] = useState(false);
  const selectionVersion = useRef(0);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<NewsValidationIssue[]>([]);
  const [notice, setNotice] = useState('');

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
    setIssues([]);
    setNotice('');
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
    const body = Array.isArray(latest.current?.news.cuerpo) ? latest.current!.news.cuerpo as Record<string, unknown>[] : [];
    const blockId = path[0] === 'cuerpo' && path[1] !== undefined ? body[Number(path[1])]?.id : undefined;
    const candidates = typeof blockId === 'string' && blockId
      ? [`[data-news-block="${CSS.escape(blockId)}"]`]
      : [`#news-field-${CSS.escape(path.join('-'))}`, `#news-field-${CSS.escape(path[0])}`];
    for (const selector of candidates) {
      const target = document.querySelector(selector);
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    }
  }

  function attempt(action: 'crear' | 'borrador') {
    if (!preview) return;
    setNotice('');
    const found = validateNewsDocument(preview.news, categories, { requireCategory: action === 'crear', requireCover: action === 'crear' });
    setIssues(found);
    if (found.length) { jumpTo(found[0].path); return; }
    setNotice(action === 'crear'
      ? 'Todos los campos son válidos. El guardado en Supabase todavía no está conectado: se habilitará en la siguiente tarea.'
      : 'Todos los campos son válidos. El guardado de borradores todavía no está conectado: se habilitará en la siguiente tarea.');
  }

  return <div className="news-import">
    <input autoComplete="off" ref={input} hidden type="file" accept=".json,application/json" onChange={event => { select(event.currentTarget.files); event.currentTarget.value = ''; }} />
    {componentsMode && <div className="news-import-topbar"><div className="component-json-shortcut"><button type="button" disabled={loading || Boolean(pending)} onClick={() => input.current?.click()}>↥ Cargar un JSON</button></div></div>}
    <div className="news-import-entry" data-hidden={componentsMode} inert={componentsMode}>
      <div className="news-import-controls" data-loaded={Boolean(preview)}>
        <div className="json-upload" data-compact={Boolean(preview)}>
          <button type="button" className="json-dropzone" data-dragging={dragging} disabled={loading}
            onClick={() => input.current?.click()}
            onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
            <svg aria-hidden="true" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v4h16v-4M12 16V4m-5 5 5-5 5 5" /></svg>
            <span>{preview ? 'Cambiar archivo JSON' : 'Arrastra un archivo JSON aquí'}</span>
            <span>{preview ? preview.name : 'o haz clic para seleccionarlo'}</span>
          </button>
          <p className="json-upload-status" role="status">{error || (loading ? 'Preparando vista previa…' : '')}</p>
        </div>
        <div className="news-create-alternative"><span>o</span><button type="button" disabled={loading} onClick={() => {
          selectionVersion.current += 1; setError('');
          if (!latest.current) {
            const value = { revision: 1, name: 'noticia-por-componentes.json', news: createNewsDocument() };
            baseline.current = JSON.stringify(value.news); latest.current = value; setPreview(value);
          }
          setComponentsMode(true);
        }}>Generar en componentes</button></div>
      </div>
    </div>
    {preview && issues.length > 0 && <div className="news-validation-summary" role="alert" aria-live="assertive">
      <strong>Revisa estos {issues.length === 1 ? 'campo' : 'campos'} antes de continuar</strong>
      <ul>{issues.map((issue, i) => <li key={i}><button type="button" onClick={() => jumpTo(issue.path)}>{issue.message}</button></li>)}</ul>
    </div>}
    {preview && notice && <p className="news-validation-notice" role="status">{notice}</p>}
    {preview && <NewsComposer key={preview.revision} showToolbar={componentsMode} categories={categories} news={preview.news} issues={issues}
      onChange={news => { const value = { ...preview, news }; latest.current = value; setPreview(value); }} />}
    {preview && <div className="news-import-actions news-preview-actions" aria-label="Acciones de la noticia">
      <button type="button" onClick={() => attempt('crear')}>Crear</button>
      <button type="button" onClick={() => attempt('borrador')}>Guardar borrador</button>
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
