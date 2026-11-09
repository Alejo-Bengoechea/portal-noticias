export type WorkspaceKind = 'plans' | 'ideas' | 'sources';
export const workspaceTables = { plans: 'editorial_plans', ideas: 'editorial_ideas', sources: 'editorial_sources' } as const;
export const productionStates = { pendiente: 'Por producir', en_produccion: 'En producción', preparada: 'Preparada' } as const;
export const sourceKinds = { persona: 'Persona', organismo: 'Organismo', medio: 'Medio', documentacion: 'Documentación' } as const;
export type WorkspaceRow = { id: string; created_at: string; updated_at: string; [key: string]: unknown };
export type Plan = WorkspaceRow & { title: string; scheduled_on: string; state: keyof typeof productionStates; notes: string; priority: 'normal' | 'alta' };
export type Idea = WorkspaceRow & { title: string; notes: string };
export type EditorialSource = WorkspaceRow & { name: string; kind: keyof typeof sourceKinds; organization: string; url: string; email: string; phone: string; notes: string; favorite: boolean };
export const workspaceKey = (kind: WorkspaceKind) => `editorial.workspace.${kind}.v1`;
export const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2200-12-31';
}
export function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
}
export function startWeek(day: string) { return shiftDay(day, -(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7); }
export function periodDays(day: string, view: 'dia' | 'semana' | 'mes') {
  if (view === 'dia') return [day];
  const start = view === 'semana' ? startWeek(day) : `${day.slice(0, 7)}-01`;
  const count = view === 'semana' ? 7 : new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => shiftDay(start, i));
}
export function shiftPeriod(day: string, view: 'dia' | 'semana' | 'mes', direction: number) {
  if (view !== 'mes') return shiftDay(day, direction * (view === 'dia' ? 1 : 7));
  const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + direction); return date.toISOString().slice(0, 10);
}

export function validateWorkspaceValues(kind: WorkspaceKind, value: unknown): Record<string, string | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Los datos no son válidos.');
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error(`${key === 'title' || key === 'name' ? 'El título o nombre' : key === 'notes' ? 'Las notas' : key}: revisa el contenido (máximo ${max} caracteres).`);
    return value.trim();
  };
  const notes = text('notes', 3000);
  if (kind === 'plans') {
    const title = text('title', 160, true), day = text('scheduled_on', 10, true);
    if (!validDay(day)) throw new Error('Selecciona una fecha válida entre 1900 y 2200.');
    if (!Object.hasOwn(productionStates, String(input.state))) throw new Error('Selecciona un estado de producción válido.');
    if (!['normal', 'alta'].includes(String(input.priority))) throw new Error('Selecciona una prioridad válida.');
    return { title, scheduled_on: day, state: String(input.state), priority: String(input.priority), notes };
  }
  if (kind === 'ideas') return { title: text('title', 160, true), notes };
  const name = text('name', 120, true), organization = text('organization', 120), url = text('url', 2048), email = text('email', 254), phone = text('phone', 60);
  let normalizedUrl = url;
  if (!Object.hasOwn(sourceKinds, String(input.kind))) throw new Error('Selecciona el tipo de fuente.');
  if (url) {
    let safe = false;
    try { const parsed = new URL(url); safe = ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; normalizedUrl = parsed.href; } catch {}
    if (!safe) throw new Error('La web debe ser una URL HTTP o HTTPS válida.');
    if (normalizedUrl.length > 2048) throw new Error('La URL es demasiado larga (máximo 2048 caracteres).');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Revisa el correo electrónico.');
  if (phone && !/^[+\d\s().-]+$/.test(phone)) throw new Error('Revisa el número de teléfono.');
  if (typeof input.favorite !== 'boolean') throw new Error('El valor de favorita no es válido.');
  return { name, kind: String(input.kind), organization, url: normalizedUrl, email, phone, notes, favorite: input.favorite };
}
export function readWorkspaceLocal(kind: WorkspaceKind, storage: Pick<Storage, 'getItem'>): WorkspaceRow[] {
  const raw = storage.getItem(workspaceKey(kind));
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('No se puede leer el guardado local.');
  const ids = new Set<string>();
  return rows.map(row => {
    if (!row || !validId(row.id) || ids.has(row.id) || typeof row.created_at !== 'string' || typeof row.updated_at !== 'string') throw new Error('El guardado local contiene datos no válidos.');
    ids.add(row.id);
    return { id: row.id, created_at: row.created_at, updated_at: row.updated_at, ...validateWorkspaceValues(kind, row) };
  });
}
