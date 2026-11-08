import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader, ProgressBar } from '../components/ui';
import { subjectStats, weakSubjects } from '../lib/analytics';

export default function Weak() {
  const { log, byId } = useApp();
  const stats = subjectStats(log, byId);
  const weak = weakSubjects(stats);
  if (stats.length === 0) return (<div><PageHeader title="Weak Areas" /><EmptyState title="No data yet">Answer questions in practice mode or take an exam and your accuracy by subject will appear here.</EmptyState></div>);
  const label = (a: number, n: number) => (n < 5 ? ['Not enough data', 'bg-slate-200 text-slate-700 dark:bg-navy-800 dark:text-slate-300'] : a < 70 ? ['Needs work', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'] : a < 85 ? ['Fair', 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'] : ['Strong', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200']);
  return (
    <div>
      <PageHeader title="Weak Areas" subtitle="Accuracy by subject across all your practice and exam answers." />
      {weak.length > 0 && (
        <section className="card mb-6 border-red-300 p-5 dark:border-red-900">
          <h2 className="font-bold text-navy-900 dark:text-white">Recommended focus</h2>
          <p className="mt-1 text-sm text-slate-500">These subjects are below 70% with at least five answers. Practise them more often.</p>
          <ul className="mt-3 space-y-2">
            {weak.slice(0, 3).map((w) => (
              <li key={w.subject} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{w.subject} <span className="font-normal text-slate-500">· {w.accuracy}%</span></span>
                <span className="flex gap-2"><Link to={`/practice?subject=${encodeURIComponent(w.subject)}`} className="btn-primary !py-1">Practise</Link><Link to={`/exam?mode=subject&subject=${encodeURIComponent(w.subject)}`} className="btn-ghost !py-1">Mock exam</Link></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-navy-800"><th className="p-3">Subject</th><th className="p-3 text-right">Attempted</th><th className="p-3">Accuracy</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {stats.map((s) => { const [t, c] = label(s.accuracy, s.attempted); return (
              <tr key={s.subject} className="border-b border-slate-100 last:border-0 dark:border-navy-800">
                <td className="p-3 font-semibold">{s.subject}</td>
                <td className="p-3 text-right tabular-nums">{s.attempted}</td>
                <td className="w-1/3 p-3"><div className="flex items-center gap-3"><div className="flex-1"><ProgressBar value={s.accuracy} tone={s.accuracy < 50 ? 'red' : s.accuracy < 70 ? 'amber' : 'teal'} /></div><span className="w-12 text-right tabular-nums">{s.accuracy}%</span></div></td>
                <td className="p-3"><span className={`chip ${c}`}>{t}</span></td>
              </tr>); })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
