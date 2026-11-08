import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PageHeader, ProgressBar, Stat } from '../components/ui';
import { distinctAnswered, subjectStats, weakSubjects } from '../lib/analytics';
import { formatClock, remainingMs } from '../lib/exam';

export default function Dashboard() {
  const { playable, subjects, attempts, log, byId, session, settings } = useApp();
  const avg = attempts.length ? Math.round((attempts.reduce((s, a) => s + a.percent, 0) / attempts.length) * 10) / 10 : null;
  const answered = distinctAnswered(log);
  const progress = playable.length ? (answered / playable.length) * 100 : 0;
  const weak = weakSubjects(subjectStats(log, byId));
  const aiCount = playable.filter((q) => q.answerOrigin === 'ai_generated').length;
  const activeLeft = session ? remainingMs(session) : 0;

  return (
    <div>
      <PageHeader title="Anesthesia Mock Exam" subtitle="Question bank and timed examinations for anesthesia qualification practice." />

      {session && activeLeft > 0 && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-amber2-400 p-4">
          <div>
            <p className="font-semibold text-navy-900 dark:text-white">You have an exam in progress</p>
            <p className="text-sm text-slate-500">{session.title} · {Object.keys(session.answers).length}/{session.questionIds.length} answered · {formatClock(activeLeft)} left</p>
          </div>
          <Link to="/exam/run" className="btn-primary">Resume exam</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Questions" value={playable.length.toLocaleString()} hint="available to practise" />
        <Stat label="Subjects" value={subjects.length} />
        <Stat label="Exams completed" value={attempts.length} />
        <Stat label="Average score" value={avg === null ? '—' : `${avg}%`} hint={`pass mark ${settings.passMark}%`} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/exam" className="card group p-5 transition hover:border-teal-500">
          <p className="text-lg font-bold text-navy-900 dark:text-white">Start Mock Exam</p>
          <p className="mt-1 text-sm text-slate-500">Timed, randomly generated, no answers until you submit.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-teal-600 group-hover:underline dark:text-teal-300">Configure exam →</span>
        </Link>
        <Link to="/practice" className="card group p-5 transition hover:border-teal-500">
          <p className="text-lg font-bold text-navy-900 dark:text-white">Practice Questions</p>
          <p className="mt-1 text-sm text-slate-500">Untimed, with instant feedback and explanations.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-teal-600 group-hover:underline dark:text-teal-300">Start practising →</span>
        </Link>
        <Link to="/subjects" className="card group p-5 transition hover:border-teal-500">
          <p className="text-lg font-bold text-navy-900 dark:text-white">Subject Review</p>
          <p className="mt-1 text-sm text-slate-500">Work through one subject or topic at a time.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-teal-600 group-hover:underline dark:text-teal-300">Browse subjects →</span>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-navy-900 dark:text-white">Recent results</h2>
            {attempts.length > 0 && <Link to="/history" className="text-sm font-semibold text-teal-600 dark:text-teal-300">All history</Link>}
          </div>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500">No exams yet. Your scores will appear here after your first mock exam.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-navy-800">
              {attempts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/results/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-teal-600">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{a.title}</span>
                      <span className="text-xs text-slate-500">{new Date(a.finishedAt).toLocaleString()}</span>
                    </span>
                    <span className={`chip ${a.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{a.correct}/{a.total} · {a.percent}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-navy-900 dark:text-white">Study progress</h2>
          <p className="mt-1 text-sm text-slate-500">{answered.toLocaleString()} of {playable.length.toLocaleString()} questions attempted</p>
          <div className="mt-3"><ProgressBar value={progress} /></div>
          {weak.length > 0 ? (
            <p className="mt-4 text-sm">Focus next on <Link to={`/practice?subject=${encodeURIComponent(weak[0].subject)}`} className="font-semibold text-teal-600 dark:text-teal-300">{weak[0].subject}</Link> ({weak[0].accuracy}% accuracy).</p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Weak areas appear after you have answered at least five questions in a subject.</p>
          )}
        </section>
      </div>

      {aiCount > 0 && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {aiCount.toLocaleString()} questions had no answer key in the source PDFs. Their answers and explanations are AI-generated, are labelled as such, and are not verified. You can leave them out of an exam on the exam setup screen.
        </p>
      )}
    </div>
  );
}
