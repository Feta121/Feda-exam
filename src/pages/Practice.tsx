import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader, ProgressBar, Select } from '../components/ui';
import QuestionView from '../components/QuestionView';
import { IconArrowRight } from '../components/icons';
import { filterPool, optionOrderFor, shuffle } from '../lib/exam';
import { latestWrong } from '../lib/analytics';

export default function Practice() {
  const { questions, subjects, settings, setSettings, log, addLog, bookmarks, toggleBookmark, hiddenIds } = useApp();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || '';
  const subject = params.get('subject') || '';
  const topic = params.get('topic') || '';
  const [shuffled, setShuffled] = useState(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ done: 0, correct: 0 });

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const pool = useMemo(() => {
    const base = { includeAi: settings.includeAi, hiddenIds, subjects: subject ? [subject] : undefined };
    let p = filterPool(questions, mode === 'wrong' ? { ...base, ids: latestWrong(log) } : mode === 'bookmarks' ? { ...base, ids: bookmarks } : base);
    if (topic) p = p.filter((q) => q.topic === topic);
    return p;
    // `log` and `bookmarks` are read once per (re)build on purpose: changing them mid-session must not reshuffle the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, subject, topic, mode, settings.includeAi, hiddenIds]);

  const topics = useMemo(() => {
    const ts = new Set<string>();
    filterPool(questions, { includeAi: true, hiddenIds, subjects: subject ? [subject] : undefined }).forEach((q) => q.topic && ts.add(q.topic));
    return [...ts].sort();
  }, [questions, subject, hiddenIds]);

  useEffect(() => {
    const ids = pool.map((q) => q.id);
    setQueue(shuffled ? shuffle(ids) : ids);
    setI(0); setSelected(null); setRevealed(false); setTally({ done: 0, correct: 0 });
  }, [pool, shuffled]);

  const qid = queue[i];
  const q = qid ? byId.get(qid) : undefined;
  useEffect(() => {
    if (q && !orders[q.id]) setOrders((o) => ({ ...o, [q.id]: optionOrderFor(q) }));
  }, [q, orders]);

  // Choosing an option is the answer: the result, correct option and explanation appear immediately and the choice is locked.
  const choose = (key: string) => {
    if (!q || revealed) return;
    const ok = key === q.answer;
    setSelected(key);
    setRevealed(true);
    setTally((t) => ({ done: t.done + 1, correct: t.correct + (ok ? 1 : 0) }));
    addLog([{ qid: q.id, correct: ok, ts: Date.now(), mode: 'practice' }]);
  };
  const next = () => { setSelected(null); setRevealed(false); setI((n) => Math.min(n + 1, queue.length)); };
  // Enter or the right arrow moves on once an answer has been shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!revealed || i >= queue.length) return;
      const t = e.target;
      if (t instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.closest('[data-practice-action]'))) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelected(null);
        setRevealed(false);
        setI((n) => Math.min(n + 1, queue.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, i, queue.length]);

  // After moving on, bring the new question back into view if the explanation had scrolled the page down.
  const prevI = useRef(0);
  useEffect(() => {
    if (i !== prevI.current) {
      const el = document.getElementById('practice-card');
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView?.({ block: 'start' });
    }
    prevI.current = i;
  }, [i]);

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    if (k === 'subject') n.delete('topic');
    setParams(n, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Practice" subtitle={mode === 'wrong' ? 'Questions you last answered incorrectly' : mode === 'bookmarks' ? 'Your bookmarked questions' : 'Untimed practice: click an answer to see the result and explanation straight away'} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Subject" value={subject} onChange={(v) => setParam('subject', v)}>
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select label="Topic" value={topic} onChange={(v) => setParam('topic', v)}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select label="Order" value={shuffled ? 'random' : 'fixed'} onChange={(v) => setShuffled(v === 'random')}>
          <option value="random">Random</option>
          <option value="fixed">As in the book</option>
        </Select>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={settings.includeAi} onChange={(e) => setSettings({ includeAi: e.target.checked })} />
          Include AI-generated answers
        </label>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="No questions match these filters">{mode === 'wrong' ? 'You have no missed questions yet.' : mode === 'bookmarks' ? 'Bookmark questions with the ribbon icon while you study.' : 'Try a different subject or topic.'}</EmptyState>
      ) : i >= queue.length ? (
        <div className="card p-8 text-center">
          <p className="text-xl font-bold text-navy-900 dark:text-white">Set complete</p>
          <p className="mt-1 text-slate-500">{tally.correct} of {tally.done} correct{tally.done ? ` (${Math.round((tally.correct / tally.done) * 100)}%)` : ''}</p>
          <button className="btn-primary mt-4" onClick={() => { setQueue(shuffled ? shuffle(queue) : queue); setI(0); setTally({ done: 0, correct: 0 }); }}>Practise again</button>
        </div>
      ) : (
        q && (
          <>
            {/* Pinned just under the app bar so Next is always in reach, however long the explanation is. */}
            <div role="region" aria-label="Practice controls" className="sticky top-[49px] z-10 -mx-4 mb-3 border-b border-slate-200 bg-slate-50/95 px-4 pb-2 pt-2 backdrop-blur dark:border-navy-800 dark:bg-navy-950/95 lg:top-0 lg:mx-0 lg:rounded-b-lg lg:px-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm text-slate-500">
                  <span className="font-semibold text-navy-800 dark:text-white">Question {i + 1} of {queue.length}</span>
                  {tally.done > 0 && <span className="ml-2 hidden sm:inline">{tally.correct}/{tally.done} correct this session</span>}
                </div>
                {revealed ? (
                  <button data-practice-action className="btn-primary shrink-0" onClick={next}>{i === queue.length - 1 ? 'Finish' : 'Next question'}<IconArrowRight className="h-4 w-4" /></button>
                ) : (
                  <button data-practice-action className="btn-ghost shrink-0" onClick={next}>Skip</button>
                )}
              </div>
              <div className="mt-2"><ProgressBar value={(i / queue.length) * 100} /></div>
            </div>
            <div id="practice-card" className="card scroll-mt-28 p-5 sm:p-7">
              <QuestionView key={q.id} q={q} order={orders[q.id] ?? optionOrderFor(q)} selected={selected} onSelect={revealed ? undefined : choose} reveal={revealed} bookmarked={bookmarks.has(q.id)} onBookmark={() => toggleBookmark(q.id)} />
            </div>
          </>
        )
      )}
    </div>
  );
}
