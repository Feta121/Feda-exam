import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader } from '../components/ui';
import { IconBookmark } from '../components/icons';
import { latestWrong } from '../lib/analytics';

export default function Saved() {
  const { byId, bookmarks, toggleBookmark, log } = useApp();
  const [tab, setTab] = useState<'bookmarks' | 'wrong'>('bookmarks');
  const ids = tab === 'bookmarks' ? [...bookmarks] : [...latestWrong(log)];
  const list = ids.map((id) => byId.get(id)).filter((q) => !!q);
  return (
    <div>
      <PageHeader
        title="Saved & Wrong Answers"
        subtitle="Revisit difficult questions and the ones you missed most recently."
        actions={list.length > 0 && <><Link className="btn-primary" to={`/practice?mode=${tab}`}>Practise these</Link><Link className="btn-ghost" to={`/exam?mode=${tab}`}>Mock exam from these</Link></>}
      />
      <div className="mb-4 flex gap-2">
        {([['bookmarks', `Bookmarks (${bookmarks.size})`], ['wrong', `Wrong answers (${latestWrong(log).size})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 dark:border-navy-800'}`}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title={tab === 'bookmarks' ? 'No bookmarks yet' : 'No wrong answers recorded'}>{tab === 'bookmarks' ? 'Tap the ribbon beside a question to save it here.' : 'Questions you answer incorrectly will appear here until you get them right.'}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.map((q) => q && (
            <li key={q.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-200">{q.question}</p>
                <p className="mt-1 text-xs text-slate-500">{q.subject}</p>
              </div>
              <button onClick={() => toggleBookmark(q.id)} className={`shrink-0 rounded p-1.5 ${bookmarks.has(q.id) ? 'text-amber2-500' : 'text-slate-400'}`} aria-label={bookmarks.has(q.id) ? 'Remove bookmark' : 'Bookmark'}><IconBookmark fill={bookmarks.has(q.id) ? 'currentColor' : 'none'} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
