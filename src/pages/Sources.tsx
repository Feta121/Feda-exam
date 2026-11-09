import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader } from '../components/ui';
import type { SourceMeta } from '../types';

interface Stat {
  total: number;
  ai: number;
  topics: Map<string, number>;
  subjects: Map<string, number>;
}

const enc = encodeURIComponent;

export default function Sources() {
  const { playable } = useApp();
  const [sources, setSources] = useState<SourceMeta[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}sources.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('missing'))))
      .then((d: SourceMeta[]) => setSources(d))
      .catch(() => setFailed(true));
  }, []);

  // Counts come from the live question bank, so admin edits and hidden questions are reflected.
  const stats = useMemo(() => {
    const m = new Map<string, Stat>();
    for (const q of playable) {
      const s = m.get(q.source) ?? { total: 0, ai: 0, topics: new Map(), subjects: new Map() };
      s.total++;
      if (q.answerOrigin === 'ai_generated') s.ai++;
      if (q.topic) s.topics.set(q.topic, (s.topics.get(q.topic) ?? 0) + 1);
      s.subjects.set(q.subject, (s.subjects.get(q.subject) ?? 0) + 1);
      m.set(q.source, s);
    }
    return m;
  }, [playable]);

  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (failed) return (<div><PageHeader title="Sources" /><EmptyState title="The sources list could not be loaded">Check your connection and reload the page.</EmptyState></div>);
  if (!sources) return (<div><PageHeader title="Sources" /><p className="text-sm text-slate-500">Loading…</p></div>);

  return (
    <div>
      <PageHeader title="Sources" subtitle="Where the questions come from. Tap a first-page picture to see the titles inside that source and practise them." />
      <div className="space-y-4">
        {sources.map((s) => {
          const st = stats.get(s.match) ?? { total: 0, ai: 0, topics: new Map<string, number>(), subjects: new Map<string, number>() };
          const isOpen = open.has(s.id);
          const panelId = `titles-${s.id}`;
          const hasTitles = s.titles.length > 0;
          const practiceAll = `/practice?source=${enc(s.match)}`;
          const examAll = `/exam?mode=source&source=${enc(s.match)}`;
          const subjects = [...st.subjects.entries()].sort((a, b) => b[1] - a[1]);
          return (
            <section key={s.id} className="card p-4 sm:p-5" aria-labelledby={`name-${s.id}`}>
              <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-5">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${isOpen ? 'Hide' : 'Show'} titles of ${s.name}`}
                  className="group relative block self-start overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-navy-700"
                >
                  <img src={`${import.meta.env.BASE_URL}${s.cover}`} alt={`First page of ${s.name}`} loading="lazy" className="block h-auto w-full" />
                  <span className="absolute inset-x-0 bottom-0 bg-navy-900/85 px-1 py-1.5 text-center text-[11px] font-semibold text-white sm:text-xs">{isOpen ? 'Hide titles' : 'Tap to see titles'}</span>
                </button>

                <div className="min-w-0">
                  <h2 id={`name-${s.id}`} className="text-base font-bold leading-snug text-navy-900 dark:text-white sm:text-lg">{s.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.byline}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="chip bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-100">{st.total.toLocaleString()} questions</span>
                    <span className="chip bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300">{s.kind} · {s.pages} pages</span>
                    {hasTitles && <span className="chip bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300">{s.titles.length} {s.titleLabel?.toLowerCase() ?? 'titles'}</span>}
                    {st.ai > 0 ? <span className="chip bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{st.ai.toLocaleString()} AI-generated answers</span> : <span className="chip bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Answers from the source</span>}
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.about}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={practiceAll} className="btn-primary !px-3 !py-1.5">Practise all</Link>
                    <Link to={examAll} className="btn-ghost !px-3 !py-1.5">Mock exam</Link>
                    <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={() => toggle(s.id)} aria-expanded={isOpen} aria-controls={panelId}>{isOpen ? 'Hide titles' : 'Show titles'}</button>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div id={panelId} className="mt-4 border-t border-slate-100 pt-4 dark:border-navy-800">
                  {hasTitles ? (
                    <>
                      <h3 className="mb-2 text-sm font-bold text-navy-900 dark:text-white">{s.titleLabel} in this source ({s.titles.length})</h3>
                      <ol className="divide-y divide-slate-100 dark:divide-navy-800">
                        {s.titles.map((t, i) => {
                          const n = st.topics.get(t) ?? 0;
                          return (
                            <li key={t} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2.5">
                              <span className="min-w-0 flex-1 text-sm">
                                <span className="mr-2 inline-block w-6 text-right text-xs font-bold tabular-nums text-teal-600 dark:text-teal-400">{i + 1}.</span>
                                {t}
                                <span className="ml-2 text-xs text-slate-500">({n})</span>
                              </span>
                              {n > 0 ? (
                                <span className="flex shrink-0 gap-2">
                                  <Link to={`${practiceAll}&topic=${enc(t)}`} className="btn-primary !px-3 !py-1 !text-xs" aria-label={`Practise ${t}`}>Practise</Link>
                                  <Link to={`${examAll}&topic=${enc(t)}`} className="btn-ghost !px-3 !py-1 !text-xs" aria-label={`Mock exam on ${t}`}>Exam</Link>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">No usable questions yet</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-300">This source has no chapter titles of its own, so there is nothing to list. You can still practise all of its questions, or by subject. Those subjects are our own grouping, not the source's.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {subjects.map(([sub, n]) => (
                          <Link key={sub} to={`${practiceAll}&subject=${enc(sub)}`} className="chip bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-200" aria-label={`Practise ${sub} from ${s.name}`}>
                            {sub} ({n})
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
