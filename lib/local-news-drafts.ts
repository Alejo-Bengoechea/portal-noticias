import type { NewsDocument } from './news-components';

export type LocalNewsDraft = { id: string; name: string; savedAt: string; news: NewsDocument };
type DraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'editorial.local-news-drafts.v1';

export function readLocalDrafts(storage: DraftStorage): LocalNewsDraft[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.savedAt === 'string' && item.news && typeof item.news.titular === 'string' && Array.isArray(item.news.cuerpo))) {
    throw new Error('Borradores locales no válidos.');
  }
  return value;
}

export function saveLocalDraft(storage: DraftStorage, name: string, news: NewsDocument) {
  const drafts = readLocalDrafts(storage);
  const next = [{ id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), news: structuredClone(news) }, ...drafts];
  // Never discard older drafts or replace the active document on quota errors.
  storage.setItem(key, JSON.stringify(next));
  return next;
}
