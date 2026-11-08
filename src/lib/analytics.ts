import type { AnswerLog, Question } from '../types';

export interface SubjectStat {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0-100
}

export function subjectStats(log: AnswerLog[], byId: Map<string, Question>): SubjectStat[] {
  const map = new Map<string, { attempted: number; correct: number }>();
  for (const e of log) {
    const q = byId.get(e.qid);
    if (!q) continue;
    const s = map.get(q.subject) ?? { attempted: 0, correct: 0 };
    s.attempted++;
    if (e.correct) s.correct++;
    map.set(q.subject, s);
  }
  return [...map.entries()]
    .map(([subject, v]) => ({ subject, attempted: v.attempted, correct: v.correct, accuracy: Math.round((v.correct / v.attempted) * 1000) / 10 }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Subjects with enough attempts to judge and accuracy under the threshold, weakest first. */
export function weakSubjects(stats: SubjectStat[], minAttempts = 5, threshold = 70): SubjectStat[] {
  return stats.filter((s) => s.attempted >= minAttempts && s.accuracy < threshold).sort((a, b) => a.accuracy - b.accuracy);
}

/** Question ids whose most recent attempt was wrong. */
export function latestWrong(log: AnswerLog[]): Set<string> {
  const last = new Map<string, AnswerLog>();
  for (const e of log) {
    const p = last.get(e.qid);
    if (!p || e.ts >= p.ts) last.set(e.qid, e);
  }
  return new Set([...last.values()].filter((e) => !e.correct).map((e) => e.qid));
}

export function distinctAnswered(log: AnswerLog[]): number {
  return new Set(log.map((e) => e.qid)).size;
}
