import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader } from '../components/ui';
import { formatClock, repeatSession } from '../lib/exam';

const TYPE: Record<string, string> = { mock: 'Mock', random: 'Random', subject: 'Subject', source: 'Source', wrong: 'Wrong answers', bookmarks: 'Bookmarks' };

export default function History() {
  const { attempts, byId, saveSession } = useApp();
  const nav = useNavigate();
  if (!attempts.length) return (<div><PageHeader title="Exam History" /><EmptyState title="No completed exams yet"><Link to="/exam" className="font-semibold text-teal-600">Start your first mock exam</Link></EmptyState></div>);
  return (
    <div>
      <PageHeader title="Exam History" subtitle="Open a result to review every question, or repeat the same exam." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-navy-800"><th className="p-3">Date</th><th className="p-3">Exam</th><th className="p-3 text-right">Questions</th><th className="p-3 text-right">Score</th><th className="p-3 text-right">%</th><th className="p-3 text-right">Time</th><th className="p-3" /></tr></thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-navy-800">
                <td className="whitespace-nowrap p-3">{new Date(a.finishedAt).toLocaleString()}</td>
                <td className="p-3"><span className="font-semibold">{a.title}</span><span className="block text-xs text-slate-500">{TYPE[a.mode] ?? a.mode}{a.subject ? ` · ${a.subject}` : ''}</span></td>
                <td className="p-3 text-right tabular-nums">{a.total}</td>
                <td className="p-3 text-right tabular-nums">{a.correct}/{a.total}</td>
                <td className="p-3 text-right"><span className={`chip ${a.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{a.percent}%</span></td>
                <td className="p-3 text-right tabular-nums">{formatClock(a.timeTakenSec * 1000)}</td>
                <td className="whitespace-nowrap p-3 text-right"><Link to={`/results/${a.id}`} className="font-semibold text-teal-600 dark:text-teal-300">Review</Link><button className="ml-3 font-semibold text-slate-500 hover:text-teal-600" onClick={() => { saveSession(repeatSession(a, byId)); nav('/exam/run'); }}>Repeat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
