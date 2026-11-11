import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AnswerLog, Attempt, ExamSession, Question, QuestionOverride, Settings } from '../types';
import { KEYS, MAX_ATTEMPTS, MAX_LOG, loadAttempts, loadBookmarks, loadLog, loadOverrides, loadSession, loadSettings, remove, write } from '../lib/storage';
import { cloudEnabled, currentUser, isAdmin as cloudIsAdmin, pullAttempts, pullOverrides, pushAttempt, pushOverride, signOut as cloudSignOut } from '../lib/cloud';
import { isPlayable } from '../lib/exam';

interface Ctx {
  loading: boolean;
  error: string | null;
  questions: Question[];
  playable: Question[];
  byId: Map<string, Question>;
  subjects: string[];
  hiddenIds: Set<string>;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
  log: AnswerLog[];
  addLog: (entries: AnswerLog[]) => void;
  attempts: Attempt[];
  saveAttempt: (a: Attempt, log: AnswerLog[]) => void;
  session: ExamSession | null;
  saveSession: (s: ExamSession | null) => void;
  overrides: Record<string, QuestionOverride>;
  saveOverride: (o: QuestionOverride) => Promise<void>;
  user: User | null;
  cloudEnabled: boolean;
  admin: boolean;
  unlockAdmin: (pass: string) => boolean;
  lockAdmin: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

function customQuestion(o: QuestionOverride): Question {
  return {
    id: o.id, question: o.question ?? '', options: o.options ?? {}, answer: o.answer ?? null, explanation: o.explanation ?? null,
    explanationOrigin: o.explanation ? 'admin' : null, answerOrigin: 'admin', subject: o.subject || 'Other', topic: o.topic ?? null,
    source: 'Added by administrator', sourceNumber: o.id.replace('CUSTOM-', ''), status: o.verified ? 'admin_verified' : 'admin_added', duplicate: 'none',
    duplicateOf: [], flags: [], directions: null, context: o.context ?? null, aiConfidence: null, review: !o.verified,
  };
}

function applyOverrides(base: Question[], ov: Record<string, QuestionOverride>): Question[] {
  const added = Object.values(ov).filter((o) => o.custom).map(customQuestion);
  return [...base, ...added].map((q) => {
    const o = ov[q.id];
    if (!o) return q;
    const next: Question = { ...q };
    if (o.question !== undefined) next.question = o.question;
    if (o.options) next.options = o.options;
    if (o.answer !== undefined) {
      next.answer = o.answer;
      next.answerOrigin = 'admin';
    }
    if (o.explanation !== undefined) {
      next.explanation = o.explanation;
      next.explanationOrigin = 'admin';
    }
    if (o.answer !== undefined && !o.verified && next.status !== 'admin_verified') next.status = 'admin_edited';
    if (o.subject) next.subject = o.subject;
    if (o.topic !== undefined) next.topic = o.topic;
    if (o.context !== undefined) next.context = o.context;
    if (o.verified) {
      next.status = 'admin_verified';
      next.review = false;
      next.answerOrigin = 'admin';
    }
    return next;
  });
}

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSCODE || (import.meta.env.DEV ? 'admin' : '');

export function AppProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(loadBookmarks()));
  const [log, setLog] = useState<AnswerLog[]>(loadLog);
  const [attempts, setAttempts] = useState<Attempt[]>(loadAttempts);
  const [session, setSession] = useState<ExamSession | null>(loadSession);
  const [overrides, setOverrides] = useState<Record<string, QuestionOverride>>(loadOverrides);
  const [user, setUser] = useState<User | null>(null);
  const [cloudAdmin, setCloudAdmin] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(() => !cloudEnabled && sessionStorage.getItem('ame:admin') === '1');

  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}questions.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load the question bank (HTTP ${r.status})`);
        return r.json();
      })
      .then((d: Question[]) => alive && setRaw(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (!cloudEnabled) return;
    const u = await currentUser();
    setUser(u);
    setCloudAdmin(await cloudIsAdmin(u));
    if (u) {
      const [remote, ov] = await Promise.all([pullAttempts(u), pullOverrides()]);
      setAttempts((cur) => {
        const merged = new Map<string, Attempt>();
        [...remote, ...cur].forEach((a) => merged.set(a.id, a));
        const arr = [...merged.values()].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, MAX_ATTEMPTS);
        write(KEYS.attempts, arr);
        return arr;
      });
      if (Object.keys(ov).length) setOverrides((cur) => ({ ...cur, ...ov }));
    }
  }, []);
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const questions = useMemo(() => applyOverrides(raw, overrides), [raw, overrides]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const hiddenIds = useMemo(() => new Set(Object.values(overrides).filter((o) => o.hidden).map((o) => o.id)), [overrides]);
  const playable = useMemo(() => questions.filter((q) => isPlayable(q) && !hiddenIds.has(q.id)), [questions, hiddenIds]);
  const subjects = useMemo(() => [...new Set(playable.map((q) => q.subject))].sort(), [playable]);

  const setSettings = (s: Partial<Settings>) =>
    setSettingsState((cur) => {
      const n = { ...cur, ...s };
      write(KEYS.settings, n);
      return n;
    });

  const toggleBookmark = (id: string) =>
    setBookmarks((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      write(KEYS.bookmarks, [...n]);
      return n;
    });

  const addLog = (entries: AnswerLog[]) =>
    setLog((cur) => {
      const n = [...cur, ...entries].slice(-MAX_LOG);
      write(KEYS.log, n);
      return n;
    });

  const saveAttempt = (a: Attempt, entries: AnswerLog[]) => {
    setAttempts((cur) => {
      const n = [a, ...cur.filter((x) => x.id !== a.id)].slice(0, MAX_ATTEMPTS);
      write(KEYS.attempts, n);
      return n;
    });
    addLog(entries);
    if (user) void pushAttempt(user, a, entries).catch(() => undefined);
  };

  const saveSession = (s: ExamSession | null) => {
    setSession(s);
    if (s) write(KEYS.session, s);
    else remove(KEYS.session);
  };

  const saveOverride = async (o: QuestionOverride) => {
    if (cloudEnabled && !cloudAdmin) throw new Error('Only administrators can edit questions');
    if (cloudEnabled) await pushOverride(o);
    setOverrides((cur) => {
      const n = { ...cur, [o.id]: o };
      write(KEYS.overrides, n);
      return n;
    });
  };

  const admin = cloudEnabled ? cloudAdmin : localAdmin;
  const unlockAdmin = (pass: string) => {
    if (cloudEnabled || !ADMIN_PASS || pass !== ADMIN_PASS) return false;
    sessionStorage.setItem('ame:admin', '1');
    setLocalAdmin(true);
    return true;
  };
  const lockAdmin = () => {
    sessionStorage.removeItem('ame:admin');
    setLocalAdmin(false);
  };
  const signOut = async () => {
    await cloudSignOut();
    setUser(null);
    setCloudAdmin(false);
  };

  const value: Ctx = {
    loading, error, questions, playable, byId, subjects, hiddenIds, settings, setSettings, bookmarks, toggleBookmark, log, addLog,
    attempts, saveAttempt, session, saveSession, overrides, saveOverride, user, cloudEnabled, admin, unlockAdmin, lockAdmin, signOut, refreshUser,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const adminConfigured = !!ADMIN_PASS || cloudEnabled;
