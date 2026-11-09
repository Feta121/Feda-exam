import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import QuestionView from '../components/QuestionView';
import { Modal } from '../components/ui';
import { IconArrowLeft, IconArrowRight, IconClock, IconFlag, Logo } from '../components/icons';
import { formatClock, isExpired, remainingMs, scoreSession } from '../lib/exam';
import type { AnswerLog, ExamSession } from '../types';

export default function ExamRun() {
  const { session, saveSession, byId, settings, saveAttempt, bookmarks, toggleBookmark } = useApp();
  const nav = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [panel, setPanel] = useState(false);
  const submitting = useRef(false);
  const firstRender = useRef(true);

  const submit = useCallback(
    (auto: boolean, s: ExamSession) => {
      if (submitting.current) return;
      submitting.current = true;
      const t = Date.now();
      const attempt = scoreSession(s, byId, settings.passMark, t, auto);
      const entries: AnswerLog[] = attempt.items.filter((i) => i.correct !== null).map((i) => ({ qid: i.qid, correct: i.correct === true, ts: t, mode: s.mode }));
      saveAttempt(attempt, entries);
      saveSession(null);
      nav(`/results/${attempt.id}`, { replace: true });
    },
    [byId, nav, saveAttempt, saveSession, settings.passMark],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Auto-submit the moment the countdown reaches zero (also covers coming back to an expired exam after a reload).
  useEffect(() => {
    if (session && isExpired(session, now)) submit(true, session);
  }, [session, now, submit]);

  const update = useCallback((patch: Partial<ExamSession>) => session && saveSession({ ...session, ...patch }), [session, saveSession]);

  const total = session?.questionIds.length ?? 0;
  const perPage = Math.max(1, session?.perPage ?? 1);
  const start = session ? Math.min(Math.floor(session.index / perPage) * perPage, Math.max(0, total - 1)) : 0;
  const end = Math.min(start + perPage, total);
  const pageIds = session ? session.questionIds.slice(start, end) : [];
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageNo = Math.floor(start / perPage) + 1;
  const lastPage = end >= total;

  // Move to the top whenever the page changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
  }, [start]);

  const goPage = useCallback((delta: number) => update({ index: Math.max(0, Math.min(total - 1, start + delta * perPage)) }), [update, total, start, perPage]);
  const jump = (i: number) => {
    update({ index: Math.floor(i / perPage) * perPage });
    setPanel(false);
    setTimeout(() => document.getElementById(`q-${i}`)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }), 0);
  };

  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (confirm || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) return;
      if (e.key === 'ArrowRight' && !lastPage) goPage(1);
      else if (e.key === 'ArrowLeft' && start > 0) goPage(-1);
      else if (perPage === 1 && /^[a-hA-H]$/.test(e.key)) {
        // Letter shortcuts only make sense when exactly one question is on screen.
        const qid = session.questionIds[start];
        const key = session.optionOrder[qid]?.[e.key.toUpperCase().charCodeAt(0) - 65];
        if (key) update({ answers: { ...session.answers, [qid]: key } });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, update, goPage, confirm, lastPage, start, perPage]);

  const counts = useMemo(() => {
    if (!session) return { answered: 0, flagged: 0 };
    return { answered: Object.keys(session.answers).length, flagged: session.flagged.length };
  }, [session]);

  if (!session) return <Navigate to="/exam" replace />;
  const left = remainingMs(session, now);
  const urgent = left < 5 * 60 * 1000;

  const Panel = (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {session.questionIds.map((id, i) => {
          const answered = id in session.answers;
          const isFlag = session.flagged.includes(id);
          const current = i >= start && i < end;
          return (
            <button
              key={id}
              onClick={() => jump(i)}
              className={`relative h-9 rounded-md text-xs font-bold tabular-nums transition ${answered ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300'} ${current ? 'ring-2 ring-navy-600 ring-offset-2 dark:ring-teal-300 dark:ring-offset-navy-900' : ''}`}
              aria-label={`Question ${i + 1}${answered ? ', answered' : ', unanswered'}${isFlag ? ', flagged for review' : ''}`}
              aria-current={current}
            >
              {i + 1}
              {isFlag && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber2-500 ring-2 ring-white dark:ring-navy-900" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-1.5 text-xs text-slate-500">
        <p><span className="mr-2 inline-block h-3 w-3 rounded bg-teal-600 align-middle" />Answered ({counts.answered})</p>
        <p><span className="mr-2 inline-block h-3 w-3 rounded bg-slate-200 align-middle dark:bg-navy-700" />Unanswered ({total - counts.answered})</p>
        <p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber2-500 align-middle" />Flagged for review ({counts.flagged})</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900">
        {/* Phone: row 1 = logo + title | timer, row 2 = progress | buttons. Larger screens: title/progress on the left, timer and buttons on the right.
            Every piece is single-line (nowrap/truncate) so text can never break into a vertical column. */}
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-3 sm:px-4 sm:py-2.5">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
            <Logo className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            <p className="truncate text-sm font-bold text-navy-900 dark:text-white">{session.title}</p>
          </div>
          <p className="col-start-1 row-start-2 truncate whitespace-nowrap text-[11px] text-slate-500 sm:pl-10 sm:text-xs">
            {perPage === 1 ? `Question ${start + 1} of ${total}` : `Questions ${start + 1}–${end} of ${total}`} · {counts.answered} answered
          </p>
          <div role="timer" aria-live="off" className={`col-start-2 row-start-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-sm font-bold tabular-nums sm:col-start-2 sm:row-span-2 sm:px-3 sm:py-1.5 sm:text-base ${urgent ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'bg-slate-100 text-navy-800 dark:bg-navy-800 dark:text-white'}`}>
            <IconClock className="h-4 w-4" />
            {formatClock(left)}
          </div>
          <div className="col-start-2 row-start-2 flex shrink-0 items-center gap-1.5 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:gap-2">
            <button className="btn-ghost whitespace-nowrap !px-2.5 !py-1.5 !text-xs sm:!px-4 sm:!text-sm lg:hidden" onClick={() => setPanel(true)}>Questions</button>
            <button className="btn-primary whitespace-nowrap !px-3.5 !py-1.5 !text-xs sm:!px-4 sm:!text-sm" onClick={() => setConfirm(true)}>Submit</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <main>
          {pageIds.map((qid, k) => {
            const i = start + k;
            const q = byId.get(qid);
            const flagged = session.flagged.includes(qid);
            return (
              <section key={qid} id={`q-${i}`} className="card mb-4 scroll-mt-20 p-5 sm:p-7">
                {q ? (
                  <QuestionView
                    q={q}
                    order={session.optionOrder[qid]}
                    number={i + 1}
                    selected={session.answers[qid] ?? null}
                    onSelect={(key) => update({ answers: { ...session.answers, [qid]: key } })}
                    bookmarked={bookmarks.has(qid)}
                    onBookmark={() => toggleBookmark(qid)}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Question {i + 1} is no longer available.</p>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    className={`btn ${flagged ? 'bg-amber2-500 text-navy-950 hover:bg-amber2-400' : 'btn-ghost'}`}
                    onClick={() => update({ flagged: flagged ? session.flagged.filter((x) => x !== qid) : [...session.flagged, qid] })}
                    aria-pressed={flagged}
                    aria-label={flagged ? `Question ${i + 1} flagged, remove flag` : `Flag question ${i + 1} for review`}
                  >
                    <IconFlag className="h-4 w-4" />{flagged ? 'Flagged' : 'Flag for review'}
                  </button>
                </div>
              </section>
            );
          })}

          <div className="mt-2 flex items-center justify-between gap-2">
            <button className="btn-ghost" disabled={start === 0} onClick={() => goPage(-1)}><IconArrowLeft className="h-4 w-4" />Previous</button>
            <span className="text-sm text-slate-500">{pages > 1 ? `Page ${pageNo} of ${pages}` : ''}</span>
            {!lastPage ? (
              <button className="btn-primary" onClick={() => goPage(1)}>Next<IconArrowRight className="h-4 w-4" /></button>
            ) : (
              <button className="btn-primary" onClick={() => setConfirm(true)}>Finish</button>
            )}
          </div>
          <p className="mt-3 hidden text-center text-xs text-slate-400 sm:block">{perPage === 1 ? 'Tip: use ← → to move and A–E to answer.' : 'Tip: use ← → to change page.'}</p>
        </main>
        <aside className="hidden lg:block">
          <div className="card sticky top-20 p-4">
            <h2 className="mb-3 text-sm font-bold text-navy-900 dark:text-white">Question navigator</h2>
            {Panel}
          </div>
        </aside>
      </div>

      <Modal open={panel} onClose={() => setPanel(false)} title="Question navigator">{Panel}</Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit exam?">
        <p className="text-sm text-slate-600 dark:text-slate-300">You have answered <b>{counts.answered}</b> of <b>{total}</b> questions.</p>
        {total - counts.answered > 0 && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">{total - counts.answered} question{total - counts.answered === 1 ? ' is' : 's are'} unanswered and will count as incorrect.</p>}
        {counts.flagged > 0 && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{counts.flagged} flagged for review.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>Keep working</button>
          <button className="btn-primary" onClick={() => submit(false, session)}>Submit now</button>
        </div>
      </Modal>
    </div>
  );
}
