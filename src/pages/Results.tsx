import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader, ProgressBar, Stat } from '../components/ui';
import QuestionView from '../components/QuestionView';
import { formatClock, repeatSession, buildSession, filterPool, optionOrderFor } from '../lib/exam';

type Filter = 'all' | 'wrong' | 'correct' | 'unanswered' | 'flagged';

export default function Results() {
  const { id } = useParams();
  const { attempts, byId, bookmarks, toggleBookmark, saveSession, settings, questions, hiddenIds } = useApp();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const a = attempts.find((x) => x.id === id);

  const bySubject = useMemo(() => {
    const m = new Map<string, { total: number; correct: number }>();
    a?.items.forEach((i) => {
      const q = byId.get(i.qid);
      if (!q) return;
      const e = m.get(q.subject) ?? { total: 0, correct: 0 };
      e.total++;
      if (i.correct) e.correct++;
      m.set(q.subject, e);
    });
    return [...m.entries()].map(([subject, v]) => ({ subject, ...v, pct: Math.round((v.correct / v.total) * 100) })).sort((x, y) => x.pct - y.pct);
  }, [a, byId]);

  if (!a) return <EmptyState title="Result not found"><Link to="/history" className="font-semibold text-teal-600">Open your history</Link></EmptyState>;

  const shown = a.items.filter((i) => {
    if (filter === 'wrong') return i.correct === false;
    if (filter === 'correct') return i.correct === true;
    if (filter === 'unanswered') return i.selected === null;
    if (filter === 'flagged') return i.flagged;
    return true;
  });
  const repeat = () => { saveSession(repeatSession(a, byId)); nav('/exam/run'); };
  const retryWrong = () => {
    const ids = new Set(a.items.filter((i) => i.correct !== true).map((i) => i.qid));
    const pool = filterPool(questions, { includeAi: true, ids, hiddenIds });
    saveSession(buildSession({ mode: 'wrong', title: 'Review: missed questions', count: 'all', durationSec: Math.max(60, pool.length * 72), pool, perPage: settings.perPage }));
    nav('/exam/run');
  };
  const chips: [Filter, string, number][] = [['all', 'All', a.items.length], ['wrong', 'Incorrect', a.incorrect], ['correct', 'Correct', a.correct], ['unanswered', 'Unanswered', a.unanswered], ['flagged', 'Flagged', a.items.filter((i) => i.flagged).length]];

  return (
    <div>
      <PageHeader
        title={a.title}
        subtitle={`${new Date(a.finishedAt).toLocaleString()}${a.autoSubmitted ? ' · submitted automatically when time ran out' : ''}`}
        actions={<><button className="btn-ghost" onClick={repeat}>Repeat this exam</button><button className="btn-primary" onClick={retryWrong} disabled={a.correct === a.total}>Retry missed questions</button></>}
      />

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500">Score</p>
          <p className="text-4xl font-bold tabular-nums text-navy-900 dark:text-white">{a.correct}/{a.total} <span className="text-2xl text-slate-500">· {a.percent}%</span></p>
        </div>
        <span className={`rounded-lg px-4 py-2 text-sm font-bold ${a.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
          {a.passed ? 'PASS' : 'FAIL'} <span className="font-normal">(pass mark {a.passMark}%)</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Correct" value={a.correct} />
        <Stat label="Incorrect" value={a.incorrect} />
        <Stat label="Unanswered" value={a.unanswered} />
        <Stat label="Time taken" value={formatClock(a.timeTakenSec * 1000)} hint={`of ${formatClock(a.durationSec * 1000)}`} />
      </div>

      {bySubject.length > 1 && (
        <section className="card mt-4 p-5">
          <h2 className="mb-3 font-bold text-navy-900 dark:text-white">Performance by subject</h2>
          <ul className="space-y-3">
            {bySubject.map((s) => (
              <li key={s.subject}>
                <div className="mb-1 flex justify-between text-sm"><span>{s.subject}</span><span className="tabular-nums text-slate-500">{s.correct}/{s.total} · {s.pct}%</span></div>
                <ProgressBar value={s.pct} tone={s.pct < 50 ? 'red' : s.pct < 70 ? 'amber' : 'teal'} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-navy-900 dark:text-white">Review</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map(([f, label, n]) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full border px-3 py-1 text-sm font-semibold ${filter === f ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 dark:border-navy-800'}`}>{label} ({n})</button>
        ))}
      </div>
      <div className="space-y-4">
        {shown.length === 0 && <EmptyState title="Nothing in this filter" />}
        {shown.map((i) => {
          const q = byId.get(i.qid);
          const n = a.items.indexOf(i) + 1;
          if (!q) return <div key={i.qid} className="card p-4 text-sm text-slate-500">Question {n} is no longer in the bank.</div>;
          const order = i.optionOrder.length ? i.optionOrder : optionOrderFor(q);
          return (
            <article key={i.qid} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`chip ${i.correct === true ? 'bg-emerald-600 text-white' : i.correct === false ? 'bg-red-600 text-white' : 'bg-slate-500 text-white'}`}>{i.correct === true ? 'Correct' : i.correct === false ? 'Incorrect' : 'Unanswered'}</span>
                {i.flagged && <span className="chip bg-amber2-500 text-navy-950">Flagged</span>}
              </div>
              <QuestionView q={q} order={order} selected={i.selected} reveal number={n} bookmarked={bookmarks.has(q.id)} onBookmark={() => toggleBookmark(q.id)} />
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-400">Settings: AI-generated answers are {settings.includeAi ? 'included' : 'excluded'} in new exams.</p>
    </div>
  );
}
