import { describe, expect, it } from 'vitest';
import { buildSession, canShuffleOptions, dedupe, filterPool, formatClock, isExpired, isPlayable, remainingMs, scoreSession, seededRng, shuffle } from './exam';
import { latestWrong, subjectStats, weakSubjects } from './analytics';
import type { Question } from '../types';

function q(id: string, over: Partial<Question> = {}): Question {
  return {
    id, question: `Question ${id}?`, options: { A: 'one', B: 'two', C: 'three', D: 'four' }, answer: 'B', explanation: 'because',
    explanationOrigin: 'source', answerOrigin: 'source', subject: 'Pharmacology', topic: null, source: 'T', sourceNumber: id,
    status: 'source_key_verified', duplicate: 'none', duplicateOf: [], flags: [], directions: null, aiConfidence: null, review: false, ...over,
  };
}
const bank = Array.from({ length: 60 }, (_, i) => q(`Q${i}`, { subject: i % 2 ? 'Airway Management' : 'Pharmacology' }));

describe('pool filtering', () => {
  it('rejects questions without usable options or key', () => {
    expect(isPlayable(q('x'))).toBe(true);
    expect(isPlayable(q('x', { answer: null }))).toBe(false);
    expect(isPlayable(q('x', { answer: 'E' }))).toBe(false);
    expect(isPlayable(q('x', { options: { A: 'only' } }))).toBe(false);
  });
  it('can exclude AI-answered questions and filter by subject', () => {
    const mixed = [q('a'), q('b', { answerOrigin: 'ai_generated' }), q('c', { subject: 'Airway Management' })];
    expect(filterPool(mixed, { includeAi: false }).map((x) => x.id)).toEqual(['a', 'c']);
    expect(filterPool(mixed, { includeAi: true, subjects: ['Airway Management'] }).map((x) => x.id)).toEqual(['c']);
  });
  it('keeps only one question from an exact duplicate cluster', () => {
    const d = [q('a', { duplicate: 'exact', duplicateOf: ['b'] }), q('b', { duplicate: 'exact', duplicateOf: ['a'] }), q('c')];
    expect(dedupe(d).map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('randomization', () => {
  it('shuffle keeps every element exactly once', () => {
    const out = shuffle([1, 2, 3, 4, 5, 6, 7, 8], seededRng(7));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('different seeds give different exams, and no question repeats inside one', () => {
    const a = buildSession({ mode: 'random', title: 't', count: 30, durationSec: 600, pool: bank, rng: seededRng(1) });
    const b = buildSession({ mode: 'random', title: 't', count: 30, durationSec: 600, pool: bank, rng: seededRng(2) });
    expect(new Set(a.questionIds).size).toBe(30);
    expect(a.questionIds).not.toEqual(b.questionIds);
  });
  it('never asks for more questions than the pool holds', () => {
    expect(buildSession({ mode: 'random', title: 't', count: 100, durationSec: 60, pool: bank.slice(0, 10) }).questionIds).toHaveLength(10);
    expect(buildSession({ mode: 'random', title: 't', count: 'all', durationSec: 60, pool: bank }).questionIds).toHaveLength(60);
  });
  it('only shuffles options when meaning cannot change', () => {
    expect(canShuffleOptions(q('x'))).toBe(true);
    expect(canShuffleOptions(q('x', { options: { A: 'Drug X', B: 'Drug Y', C: 'A and B', D: 'None of the above' } }))).toBe(false);
    expect(canShuffleOptions(q('x', { directions: 'Match each' }))).toBe(false);
    expect(canShuffleOptions(q('x', { options: { A: '1', B: '2', C: '3', D: '4' } }))).toBe(false);
  });
  it('option order is a permutation of the original keys', () => {
    const s = buildSession({ mode: 'random', title: 't', count: 20, durationSec: 60, pool: bank, rng: seededRng(5) });
    for (const id of s.questionIds) expect([...s.optionOrder[id]].sort()).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('timer', () => {
  it('counts down from a fixed end time so reloads cannot reset it', () => {
    const s = buildSession({ mode: 'mock', title: 't', count: 5, durationSec: 90, pool: bank, now: 1_000_000 });
    expect(remainingMs(s, 1_000_000)).toBe(90_000);
    expect(remainingMs(s, 1_030_000)).toBe(60_000);
    expect(isExpired(s, 1_089_999)).toBe(false);
    expect(isExpired(s, 1_090_000)).toBe(true);
    expect(remainingMs(s, 2_000_000)).toBe(0);
  });
  it('formats clocks', () => {
    expect(formatClock(90_000)).toBe('01:30');
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatClock(0)).toBe('00:00');
  });
});

describe('scoring', () => {
  const byId = new Map(bank.map((x) => [x.id, x]));
  it('counts correct, incorrect and unanswered and applies the pass mark', () => {
    const s = buildSession({ mode: 'mock', title: 't', count: 10, durationSec: 600, pool: bank, now: 0, rng: seededRng(3) });
    const ids = s.questionIds;
    for (let i = 0; i < 6; i++) s.answers[ids[i]] = 'B'; // correct
    for (let i = 6; i < 8; i++) s.answers[ids[i]] = 'A'; // wrong
    s.flagged = [ids[9]];
    const r = scoreSession(s, byId, 50, 300_000);
    expect([r.correct, r.incorrect, r.unanswered, r.total]).toEqual([6, 2, 2, 10]);
    expect(r.percent).toBe(60);
    expect(r.passed).toBe(true);
    expect(r.items[9].flagged).toBe(true);
    expect(r.timeTakenSec).toBe(300);
    expect(scoreSession(s, byId, 70, 300_000).passed).toBe(false);
  });
  it('caps time taken at the exam duration when auto-submitted late', () => {
    const s = buildSession({ mode: 'mock', title: 't', count: 3, durationSec: 60, pool: bank, now: 0 });
    expect(scoreSession(s, byId, 50, 10 * 60_000, true).timeTakenSec).toBe(60);
  });
  it('scores by original key even when options were displayed shuffled', () => {
    const s = buildSession({ mode: 'mock', title: 't', count: 1, durationSec: 60, pool: bank, rng: seededRng(9) });
    s.answers[s.questionIds[0]] = 'B';
    expect(scoreSession(s, byId, 50).correct).toBe(1);
  });
});

describe('analytics', () => {
  const byId = new Map(bank.map((x) => [x.id, x]));
  const log = [
    ...Array.from({ length: 10 }, (_, i) => ({ qid: `Q${i * 2}`, correct: i < 4, ts: i, mode: 'practice' as const })), // Pharmacology 40%
    ...Array.from({ length: 6 }, (_, i) => ({ qid: `Q${i * 2 + 1}`, correct: true, ts: 20 + i, mode: 'practice' as const })), // Airway 100%
  ];
  it('computes accuracy by subject and flags weak ones', () => {
    const stats = subjectStats(log, byId);
    expect(stats.find((s) => s.subject === 'Pharmacology')?.accuracy).toBe(40);
    expect(weakSubjects(stats).map((s) => s.subject)).toEqual(['Pharmacology']);
    expect(weakSubjects(stats, 20)).toEqual([]);
  });
  it('uses the latest result per question for the wrong-answers list', () => {
    const l = [{ qid: 'Q1', correct: false, ts: 1, mode: 'practice' as const }, { qid: 'Q1', correct: true, ts: 2, mode: 'practice' as const }, { qid: 'Q2', correct: true, ts: 1, mode: 'practice' as const }, { qid: 'Q2', correct: false, ts: 5, mode: 'practice' as const }];
    expect([...latestWrong(l)]).toEqual(['Q2']);
  });
});

import { repeatSession } from './exam';
describe('repeat', () => {
  it('creates a fresh session with the same questions and a new clock', () => {
    const byId = new Map(bank.map((x) => [x.id, x]));
    const s = buildSession({ mode: 'mock', title: 'Mock', count: 8, durationSec: 480, pool: bank, now: 0, rng: seededRng(11) });
    s.answers[s.questionIds[0]] = 'A';
    const att = scoreSession(s, byId, 50, 1000);
    const r = repeatSession(att, byId, seededRng(12), 5_000);
    expect([...r.questionIds].sort()).toEqual([...s.questionIds].sort());
    expect(r.answers).toEqual({});
    expect(r.endsAt).toBe(5_000 + 480_000);
    expect(r.title).toContain('repeat');
  });
});

describe('per-page setting', () => {
  const byId = new Map(bank.map((x) => [x.id, x]));
  it('is stored on the session, clamped to at least one, and carried through scoring and repeats', () => {
    const s = buildSession({ mode: 'mock', title: 't', count: 10, durationSec: 60, pool: bank, perPage: 5, now: 0 });
    expect(s.perPage).toBe(5);
    expect(buildSession({ mode: 'mock', title: 't', count: 4, durationSec: 60, pool: bank }).perPage).toBe(1);
    expect(buildSession({ mode: 'mock', title: 't', count: 4, durationSec: 60, pool: bank, perPage: 0 }).perPage).toBe(1);
    const att = scoreSession(s, byId, 50, 1);
    expect(att.perPage).toBe(5);
    expect(repeatSession(att, byId).perPage).toBe(5);
  });
});
