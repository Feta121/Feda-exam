import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PageHeader, Select } from '../components/ui';
import { buildSession, filterPool, formatClock, remainingMs } from '../lib/exam';
import { latestWrong } from '../lib/analytics';
import type { ExamMode } from '../types';

const COUNTS: (number | 'all')[] = [20, 30, 50, 75, 100, 'all'];
const PER_PAGE = [1, 2, 3, 5, 10, 20];
const MODES: { id: ExamMode; label: string; hint: string }[] = [
  { id: 'random', label: 'Random mix', hint: 'Questions drawn from every subject' },
  { id: 'subject', label: 'One subject', hint: 'Exam on a single subject' },
  { id: 'source', label: 'By source', hint: 'One book, or one of its chapters' },
  { id: 'wrong', label: 'My wrong answers', hint: 'Questions you last got wrong' },
  { id: 'bookmarks', label: 'Bookmarks', hint: 'Questions you saved' },
];

export default function ExamSetup() {
  const { questions, playable, subjects, settings, setSettings, log, bookmarks, hiddenIds, session, saveSession } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const initialMode = (params.get('mode') as ExamMode) || 'random';
  const [mode, setMode] = useState<ExamMode>(MODES.some((m) => m.id === initialMode) ? initialMode : 'random');
  const [subject, setSubject] = useState(params.get('subject') || subjects[0] || '');
  const sources = useMemo(() => [...new Set(playable.map((q) => q.source))], [playable]);
  const [source, setSource] = useState(params.get('source') || sources[0] || '');
  const [topic, setTopic] = useState(params.get('topic') || '');
  const [count, setCount] = useState<number | 'all'>(50);
  const [minutes, setMinutes] = useState<number | null>(null);

  const pool = useMemo(() => {
    const base = { includeAi: settings.includeAi, hiddenIds };
    if (mode === 'subject') return filterPool(questions, { ...base, subjects: [subject] });
    if (mode === 'source') return filterPool(questions, base).filter((q) => q.source === source && (!topic || q.topic === topic));
    if (mode === 'wrong') return filterPool(questions, { ...base, ids: latestWrong(log) });
    if (mode === 'bookmarks') return filterPool(questions, { ...base, ids: bookmarks });
    return filterPool(questions, base);
  }, [questions, mode, subject, source, topic, settings.includeAi, log, bookmarks, hiddenIds]);
  const titles = useMemo(() => [...new Set(playable.filter((q) => q.source === source && q.topic).map((q) => q.topic as string))].sort(), [playable, source]);

  const effective = count === 'all' ? pool.length : Math.min(count, pool.length);
  const suggested = Math.max(1, Math.ceil(effective * 1.2));
  const mins = minutes ?? suggested;
  const active = session && remainingMs(session) > 0 ? session : null;

  const start = () => {
    const title = mode === 'subject' ? `${subject} exam` : mode === 'source' ? `${source}${topic ? ` – ${topic}` : ''} exam` : mode === 'wrong' ? 'Wrong answers exam' : mode === 'bookmarks' ? 'Bookmarked questions exam' : 'Random mock exam';
    saveSession(buildSession({ mode, title, subject: mode === 'subject' ? subject : undefined, count, durationSec: Math.round(mins * 60), pool, perPage: settings.perPage }));
    nav('/exam/run');
  };

  return (
    <div>
      <PageHeader title="Mock Exam" subtitle="Configure a timed examination. Correct answers stay hidden until you submit." />

      {active && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-amber2-400 p-4">
          <p className="text-sm"><span className="font-semibold">{active.title}</span> is still in progress ({formatClock(remainingMs(active))} left).</p>
          <div className="flex gap-2">
            <Link to="/exam/run" className="btn-primary">Resume</Link>
            <button className="btn-ghost" onClick={() => confirm('Discard the exam in progress? Your answers will be lost.') && saveSession(null)}>Discard</button>
          </div>
        </div>
      )}

      <div className="card space-y-6 p-5">
        <div>
          <span className="label">Exam type</span>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-lg border p-3 text-left transition ${mode === m.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40' : 'border-slate-200 hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800'}`} aria-pressed={mode === m.id}>
                <span className="block text-sm font-bold text-navy-800 dark:text-white">{m.label}</span>
                <span className="text-xs text-slate-500">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {mode === 'subject' && (
          <Select label="Subject" value={subject} onChange={setSubject}>
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </Select>
        )}

        {mode === 'source' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Source" value={source} onChange={(v) => { setSource(v); setTopic(''); }}>
              {sources.map((n) => <option key={n}>{n}</option>)}
            </Select>
            {titles.length > 0 ? (
              <Select label="Title / chapter" value={topic} onChange={setTopic}>
                <option value="">All titles</option>
                {titles.map((t) => <option key={t}>{t}</option>)}
              </Select>
            ) : (
              <p className="self-end pb-2 text-sm text-slate-500">This source has no titles of its own, so the exam uses all of its questions.</p>
            )}
          </div>
        )}

        <div>
          <span className="label">Number of questions</span>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <button key={String(c)} onClick={() => { setCount(c); setMinutes(null); }} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${count === c ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 dark:border-navy-800'}`} aria-pressed={count === c}>
                {c === 'all' ? `All (${pool.length})` : c}
              </button>
            ))}
          </div>
          {pool.length < effective || (typeof count === 'number' && count > pool.length) ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Only {pool.length} matching questions are available, so the exam will have {effective}.</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Duration (minutes)</span>
            <input className="input" type="number" min={1} max={600} value={mins} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
            <span className="mt-1 block text-xs text-slate-500">Suggested: {suggested} min (about 72 seconds per question)</span>
          </label>
          <label className="block">
            <span className="label">Pass mark (%)</span>
            <input className="input" type="number" min={1} max={100} value={settings.passMark} onChange={(e) => setSettings({ passMark: Math.min(100, Math.max(1, Number(e.target.value) || 50)) })} />
          </label>
        </div>

        <Select label="Questions per page" value={String(settings.perPage)} onChange={(v) => setSettings({ perPage: Number(v) })}>
          {PER_PAGE.map((n) => <option key={n} value={n}>{n === 1 ? '1 question per page' : `${n} questions per page`}{n === 5 ? ' (default)' : ''}</option>)}
        </Select>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-600" checked={settings.includeAi} onChange={(e) => setSettings({ includeAi: e.target.checked })} />
          <span>
            <span className="font-semibold">Include questions with AI-generated answers</span>
            <span className="block text-xs text-slate-500">These had no answer key in the source PDFs. Turn off to use only questions whose answers come from the books ({playable.filter((q) => q.answerOrigin !== 'ai_generated').length.toLocaleString()} available).</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-navy-800">
          <p className="text-sm text-slate-500">{effective} questions · {mins} minutes · {settings.perPage} per page</p>
          <button className="btn-primary" disabled={effective === 0} onClick={start}>Start exam</button>
        </div>
        {effective === 0 && <p className="text-sm text-red-600">No questions match this selection yet.{mode === 'wrong' ? ' Answer some questions in practice mode or an exam first.' : mode === 'bookmarks' ? ' Bookmark questions while you study.' : ''}</p>}
      </div>
    </div>
  );
}
