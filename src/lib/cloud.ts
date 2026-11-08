/**
 * Optional Supabase integration. Everything here is inactive unless VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set; without them the app runs fully offline using browser storage.
 * See supabase/schema.sql for the tables and row-level-security policies this code expects.
 */
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AnswerLog, Attempt, QuestionOverride } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = !!(url && key);
export const supabase: SupabaseClient | null = cloudEnabled ? createClient(url!, key!) : null;

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Cloud sync is not configured');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Cloud sync is not configured');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export async function isAdmin(user: User | null): Promise<boolean> {
  if (!supabase || !user) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
}

export async function pushAttempt(user: User, a: Attempt, log: AnswerLog[]) {
  if (!supabase) return;
  await supabase.from('attempts').upsert({ id: a.id, user_id: user.id, payload: a, finished_at: new Date(a.finishedAt).toISOString() });
  if (log.length) await supabase.from('answer_log').insert(log.map((l) => ({ user_id: user.id, qid: l.qid, correct: l.correct, ts: new Date(l.ts).toISOString(), mode: l.mode })));
}

export async function pullAttempts(user: User): Promise<Attempt[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('attempts').select('payload').eq('user_id', user.id).order('finished_at', { ascending: false }).limit(300);
  return (data ?? []).map((r) => r.payload as Attempt);
}

export async function pullOverrides(): Promise<Record<string, QuestionOverride>> {
  if (!supabase) return {};
  const { data } = await supabase.from('question_overrides').select('qid,payload');
  const out: Record<string, QuestionOverride> = {};
  for (const r of data ?? []) out[r.qid as string] = r.payload as QuestionOverride;
  return out;
}

export async function pushOverride(o: QuestionOverride) {
  if (!supabase) return;
  const { error } = await supabase.from('question_overrides').upsert({ qid: o.id, payload: o, updated_at: new Date(o.updatedAt).toISOString() });
  if (error) throw error;
}
