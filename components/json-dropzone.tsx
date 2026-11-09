'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { parseNewsPreview } from './news-preview';
import { NewsComposer } from './news-composer';
import { createNewsDocument } from '@/lib/news-components';
import { readLocalDrafts, saveLocalDraft, type LocalNewsDraft } from '@/lib/local-news-drafts';
import { normalizeNewsDocument } from '@/lib/news-import';

type IncomingNews = { name: string; news: ReturnType<typeof parseNewsPreview> };
type Preview = IncomingNews & { revision: number };

export function JsonDropzone({ categories = [], initialDraftId, showDraftsInitially = false }: { categories?: { id: string; name: string }[]; initialDraftId?: string; showDraftsInitially?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const draftsId = useId();
  const draftsMenu = useRef<HTMLDivElement>(null);
  const [draftsTop, setDraftsTop] = useState(100);
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
  const [drafts, setDrafts] = useState<LocalNewsDraft[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [componentsMode, setComponentsMode] = useState(false);
  const selectionVersion = useRef(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showDraftsInitially && draftsMenu.current && !draftsMenu.current.matches(':popover-open')) {
      const trigger = draftsMenu.current.parentElement?.querySelector('.local-drafts-launcher button');
      if (trigger) setDraftsTop(Math.min(trigger.getBoundingClientRect().bottom + 8, Math.max(8, window.innerHeight - 300)));
      draftsMenu.current.showPopover();
    }
  }, [showDraftsInitially]);

  useEffect(() => {
    try {
      const stored = readLocalDrafts(localStorage);
      setDrafts(stored);
      if (initialDraftId) {
        const draft = stored.find(item => item.id === initialDraftId);
        if (draft) requestOpen({ name: draft.name, news: normalizeNewsDocument(structuredClone(draft.news)) });
        else setError('Este borrador local ya no está disponible en este navegador.');
      }
    }
    catch { setError('No se pudieron leer los borradores locales de este navegador.'); }
  }, [initialDraftId]);
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
  }
  function requestOpen(next: IncomingNews) {
    if (latest.current && JSON.stringify(latest.current.news) !== baseline.current) setPending(next);
    else openNews(next);
  }
  function saveAndOpen() {
    if (!pending || !latest.current) return;
    try {
      setDrafts(saveLocalDraft(localStorage, latest.current.name, latest.current.news));
      openNews(pending);
    } catch { setError('No se pudo guardar el borrador local. Tu trabajo sigue abierto; no se ha reemplazado.'); }
  }

  async function select(files: FileList | null) {
    if (pending || !files?.length) return;
    const candidate = files[0];
    if (files.length !== 1 || !/\.json$/i.test(candidate.name)) { setJsonError('Selecciona un solo archivo con extensión .json.'); return; }
    if (candidate.size > 2 * 1024 * 1024) { setJsonError('El archivo JSON supera los 2 MB.'); return; }
    setError(''); setLoading(true);
    const version = ++selectionVersion.current;
    try {
      const news = parseNewsPreview((await candidate.text()).replace(/^\uFEFF/, ''));
      if (selectionVersion.current === version) requestOpen({ name: candidate.name, news });
    } catch (error) {
      if (selectionVersion.current === version) setJsonError(error instanceof Error ? error.message : 'No se pudo leer el JSON.');
    } finally { if (selectionVersion.current === version) setLoading(false); }
  }

  return <div className="news-import">
    <input autoComplete="off" ref={input} hidden type="file" accept=".json,application/json" onChange={event => { select(event.currentTarget.files); event.currentTarget.value = ''; }} />
    <div className="news-import-topbar">
    {componentsMode && <div className="component-json-shortcut"><button type="button" disabled={loading || Boolean(pending)} onClick={() => input.current?.click()}>↥ Cargar un JSON</button></div>}
    <div className="local-drafts-launcher"><button type="button" popoverTarget={draftsId} disabled={loading || Boolean(pending)} onClick={event => setDraftsTop(Math.min(event.currentTarget.getBoundingClientRect().bottom + 8, Math.max(8, window.innerHeight - 300)))}>▱ Borradores locales <span>{drafts.length}</span>⌄</button></div>
    </div>
    <div ref={draftsMenu} id={draftsId} popover="auto" className="local-drafts-popover" style={{ top: draftsTop }}>
      <header><strong>Borradores locales</strong><span>Solo en este navegador</span></header>
      {!drafts.length && <p>No tienes borradores guardados todavía.</p>}
      {drafts.map(draft => <button type="button" key={draft.id} disabled={loading || Boolean(pending)} onClick={() => {
        try { requestOpen({ name: draft.name, news: normalizeNewsDocument(structuredClone(draft.news)) }); draftsMenu.current?.hidePopover(); }
        catch (error) { setJsonError(error instanceof Error ? error.message : 'Este borrador no se puede abrir.'); }
      }}><strong>{String(draft.news.titular || draft.name)}</strong><span>{new Date(draft.savedAt).toLocaleString('es-ES')} · Editar ↗</span></button>)}
    </div>
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
        {preview && <div className="news-import-actions"><button type="button" disabled>Crear</button><button type="button" disabled>Guardar borrador</button></div>}
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
    {preview && <NewsComposer key={preview.revision} showToolbar={componentsMode} categories={categories} news={preview.news} onChange={news => { const value = { ...preview, news }; latest.current = value; setPreview(value); }} />}
    {preview && <div className="news-import-actions news-preview-actions" aria-label="Acciones de la noticia"><button type="button" disabled>Crear</button><button type="button" disabled>Guardar borrador</button></div>}
    {componentsMode && <p className="json-upload-status" role="status">{error || (loading ? 'Preparando JSON…' : '')}</p>}
    <dialog ref={errorDialog} className="category-confirm-dialog json-error-dialog" aria-labelledby="json-error-title" onCancel={() => setJsonError('')} onClose={() => setJsonError('')}>
      <h2 id="json-error-title">No se pudo abrir el JSON</h2><p>{jsonError}</p><p>Corrige el archivo y vuelve a cargarlo. Tu noticia actual no se ha modificado.</p>
      <button type="button" autoFocus onClick={() => setJsonError('')}>Entendido</button>
    </dialog>
    <dialog ref={confirmation} className="category-confirm-dialog json-replace-dialog" aria-labelledby="json-replace-title" onCancel={() => setPending(null)} onClose={() => setPending(null)}>
      <h2 id="json-replace-title">Tienes cambios en esta noticia</h2>
      <p>Abrir «{pending?.name}» reemplazará todo el contenido actual. ¿Qué quieres hacer?</p>
      <p>El borrador se guardará solo en este navegador y podrás recuperarlo desde Borradores locales.</p>
      <p role="alert">{error}</p>
      <div className="json-replace-actions"><button className="json-replace-cancel" type="button" autoFocus onClick={() => setPending(null)}>Cancelar</button><button className="json-replace-discard" type="button" onClick={() => { if (pending) openNews(pending); }}>Reemplazar sin guardar</button><button className="json-replace-save" type="button" onClick={saveAndOpen}>Guardar borrador y abrir JSON</button></div>
    </dialog>
  </div>;
}
