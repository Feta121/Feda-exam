import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PageHeader, ProgressBar } from '../components/ui';
import { subjectStats } from '../lib/analytics';

export default function Subjects() {
  const { playable, subjects, log, byId } = useApp();
  const stats = useMemo(() => new Map(subjectStats(log, byId).map((s) => [s.subject, s])), [log, byId]);
  const info = useMemo(() => {
    const m = new Map<string, { count: number; topics: Map<string, number> }>();
    playable.forEach((q) => {
      const e = m.get(q.subject) ?? { count: 0, topics: new Map() };
      e.count++;
      if (q.topic) e.topics.set(q.topic, (e.topics.get(q.topic) ?? 0) + 1);
      m.set(q.subject, e);
    });
    return m;
  }, [playable]);

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Questions are grouped from the chapters of your source books. Pick a subject to practise or take a mock exam on it." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {subjects.map((s) => {
          const e = info.get(s)!;
          const st = stats.get(s);
          const topics = [...e.topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
          return (
            <section key={s} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-navy-900 dark:text-white">{s}</h2>
                <span className="chip bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-100">{e.count} questions</span>
              </div>
              <div className="mt-3">
                {st ? (<><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{st.attempted} attempted</span><span>{st.accuracy}% accuracy</span></div><ProgressBar value={st.accuracy} tone={st.accuracy < 50 ? 'red' : st.accuracy < 70 ? 'amber' : 'teal'} /></>) : <p className="text-xs text-slate-400">Not attempted yet</p>}
              </div>
              {topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topics.map(([t, n]) => (
                    <Link key={t} to={`/practice?subject=${encodeURIComponent(s)}&topic=${encodeURIComponent(t)}`} className="chip bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300" title="Practise this topic">{t.length > 34 ? t.slice(0, 33) + '…' : t} ({n})</Link>
                  ))}
                </div>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <Link className="btn-primary flex-1" to={`/practice?subject=${encodeURIComponent(s)}`}>Practise</Link>
                <Link className="btn-ghost flex-1" to={`/exam?mode=subject&subject=${encodeURIComponent(s)}`}>Mock exam</Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
