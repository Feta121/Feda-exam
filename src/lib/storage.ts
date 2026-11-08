import type { AnswerLog, Attempt, ExamSession, QuestionOverride, Settings } from '../types';

const P = 'ame:';
export const KEYS = {
  settings: P + 'settings',
  log: P + 'log',
  bookmarks: P + 'bookmarks',
  attempts: P + 'attempts',
  session: P + 'session',
  overrides: P + 'overrides',
  theme: P + 'theme',
} as const;

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked (private mode): the app keeps working in memory
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const DEFAULT_SETTINGS: Settings = { passMark: 50, includeAi: true, perPage: 5 };
export const MAX_LOG = 20000;
export const MAX_ATTEMPTS = 300;

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) });
export const loadLog = () => read<AnswerLog[]>(KEYS.log, []);
export const loadBookmarks = () => read<string[]>(KEYS.bookmarks, []);
export const loadAttempts = () => read<Attempt[]>(KEYS.attempts, []);
export const loadSession = (): ExamSession | null => read<ExamSession | null>(KEYS.session, null);
export const loadOverrides = () => read<Record<string, QuestionOverride>>(KEYS.overrides, {});
