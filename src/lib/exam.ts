import type { Attempt, AttemptItem, ExamMode, ExamSession, Question } from '../types';

export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) so tests can seed shuffles. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crypto-quality randomness when available, otherwise Math.random. */
export const defaultRng: Rng = () => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
};

export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A question can be used in a test only if it has at least two options and a key that points at one of them. */
export function isPlayable(q: Question): boolean {
  const keys = Object.keys(q.options || {});
  return !!q.question && keys.length >= 2 && !!q.answer && keys.includes(q.answer);
}

export interface PoolFilter {
  subjects?: string[];
  includeAi: boolean;
  verifiedOnly?: boolean;
  ids?: Set<string>;
  hiddenIds?: Set<string>;
}

/** Keeps one question from each exact/likely duplicate cluster so an exam never contains the same question twice. */
export function dedupe(pool: Question[]): Question[] {
  const taken = new Set<string>();
  const out: Question[] = [];
  for (const q of pool) {
    const dup = q.duplicate === 'exact' || q.duplicate === 'likely';
    if (dup && q.duplicateOf.some((id) => taken.has(id))) continue;
    taken.add(q.id);
    out.push(q);
  }
  return out;
}

export function filterPool(all: Question[], f: PoolFilter): Question[] {
  let pool = all.filter(isPlayable);
  if (f.hiddenIds) pool = pool.filter((q) => !f.hiddenIds!.has(q.id));
  if (f.subjects && f.subjects.length) pool = pool.filter((q) => f.subjects!.includes(q.subject));
  if (!f.includeAi) pool = pool.filter((q) => q.answerOrigin !== 'ai_generated');
  if (f.verifiedOnly) pool = pool.filter((q) => q.status === 'source_key_verified' || q.status === 'admin_verified');
  if (f.ids) pool = pool.filter((q) => f.ids!.has(q.id));
  return dedupe(pool);
}

const FIXED_ORDER = /(all|none|both|neither)\s+of\s+(the\s+)?(above|these|those)|\b(a|b|c|d)\s*(and|&|,)\s*(a|b|c|d|e)\b|above\s+(are|is)|all\s+are|none\s+are/i;

/** Options are only shuffled when doing so cannot change their meaning. */
export function canShuffleOptions(q: Question): boolean {
  if (q.directions || q.flags.some((f) => f.startsWith('matching') || f === 'maybe_figure')) return false;
  const texts = Object.values(q.options);
  if (texts.some((t) => FIXED_ORDER.test(t))) return false;
  if (texts.every((t) => /^[\d.,\s<>=≤≥%-]+(\w{0,6})?$/.test(t.trim()))) return false; // numeric scales stay ordered
  return true;
}

export function optionOrderFor(q: Question, rng: Rng = defaultRng): string[] {
  const keys = Object.keys(q.options).sort();
  return canShuffleOptions(q) ? shuffle(keys, rng) : keys;
}

export interface BuildOptions {
  mode: ExamMode;
  title: string;
  subject?: string;
  count: number | 'all';
  durationSec: number;
  pool: Question[];
  perPage?: number;
  now?: number;
  rng?: Rng;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(defaultRng() * 1e6).toString(36)}`;
}

export function buildSession(o: BuildOptions): ExamSession {
  const rng = o.rng ?? defaultRng;
  const now = o.now ?? Date.now();
  const chosen = shuffle(o.pool, rng).slice(0, o.count === 'all' ? o.pool.length : Math.min(o.count, o.pool.length));
  const optionOrder: Record<string, string[]> = {};
  for (const q of chosen) optionOrder[q.id] = optionOrderFor(q, rng);
  return {
    id: newId('exam'),
    mode: o.mode,
    title: o.title,
    subject: o.subject,
    createdAt: now,
    endsAt: now + o.durationSec * 1000,
    durationSec: o.durationSec,
    questionIds: chosen.map((q) => q.id),
    perPage: Math.max(1, Math.floor(o.perPage ?? 1)),
    optionOrder,
    answers: {},
    flagged: [],
    index: 0,
  };
}

export const remainingMs = (s: ExamSession, now: number = Date.now()) => Math.max(0, s.endsAt - now);
export const isExpired = (s: ExamSession, now: number = Date.now()) => now >= s.endsAt;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function scoreSession(
  s: ExamSession,
  byId: Map<string, Question>,
  passMark: number,
  now: number = Date.now(),
  autoSubmitted = false,
): Attempt {
  const items: AttemptItem[] = s.questionIds.map((qid) => {
    const q = byId.get(qid);
    const selected = s.answers[qid] ?? null;
    return {
      qid,
      selected,
      correct: selected === null || !q ? null : selected === q.answer,
      flagged: s.flagged.includes(qid),
      optionOrder: s.optionOrder[qid] ?? Object.keys(q?.options ?? {}).sort(),
    };
  });
  const correct = items.filter((i) => i.correct === true).length;
  const incorrect = items.filter((i) => i.correct === false).length;
  const unanswered = items.length - correct - incorrect;
  const percent = items.length ? Math.round((correct / items.length) * 1000) / 10 : 0;
  const finishedAt = Math.min(now, s.endsAt);
  return {
    id: s.id,
    title: s.title,
    mode: s.mode,
    subject: s.subject,
    startedAt: s.createdAt,
    finishedAt: now,
    durationSec: s.durationSec,
    timeTakenSec: Math.max(0, Math.round((finishedAt - s.createdAt) / 1000)),
    total: items.length,
    correct,
    incorrect,
    unanswered,
    percent,
    passMark,
    passed: percent >= passMark,
    autoSubmitted,
    perPage: s.perPage,
    items,
  };
}

/** A new session containing the same questions as a finished attempt (answer order is reshuffled). */
export function repeatSession(a: Attempt, byId: Map<string, Question>, rng: Rng = defaultRng, now: number = Date.now()): ExamSession {
  const ids = a.items.map((i) => i.qid).filter((id) => byId.has(id));
  const optionOrder: Record<string, string[]> = {};
  for (const id of ids) optionOrder[id] = optionOrderFor(byId.get(id)!, rng);
  return {
    id: newId('exam'), mode: a.mode, title: `${a.title} (repeat)`, subject: a.subject, createdAt: now, endsAt: now + a.durationSec * 1000,
    durationSec: a.durationSec, questionIds: shuffle(ids, rng), perPage: a.perPage ?? 1, optionOrder, answers: {}, flagged: [], index: 0,
  };
}
