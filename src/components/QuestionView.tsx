import type { Question } from '../types';
import { IconBookmark } from './icons';
import { Provenance } from './ui';

interface Props {
  q: Question;
  order: string[];
  selected: string | null;
  onSelect?: (key: string) => void;
  reveal?: boolean;
  number?: number;
  bookmarked?: boolean;
  onBookmark?: () => void;
  showMeta?: boolean;
}

const LETTERS = 'ABCDEFGH';

export default function QuestionView({ q, order, selected, onSelect, reveal = false, number, bookmarked, onBookmark, showMeta = true }: Props) {
  const correctKey = q.answer;
  const correctDisplay = correctKey ? LETTERS[order.indexOf(correctKey)] : '?';
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {q.context && (
            <blockquote className="mb-3 rounded-md border-l-4 border-teal-500 bg-teal-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:bg-teal-950/30 dark:text-slate-300">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">Case for this question</span>
              {q.context}
            </blockquote>
          )}
          {q.directions && <p className="mb-2 rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-700 dark:bg-navy-800 dark:text-navy-200">{q.directions}</p>}
          <p className="font-serif text-[1.15rem] leading-relaxed text-slate-900 dark:text-slate-100">
            {number !== undefined && <span className="mr-2 font-sans text-sm font-bold text-teal-600 dark:text-teal-400">{number}.</span>}
            {q.question}
          </p>
        </div>
        {onBookmark && (
          <button onClick={onBookmark} className={`rounded-md p-2 ${bookmarked ? 'text-amber2-500' : 'text-slate-400 hover:text-slate-600'}`} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark question'} aria-pressed={!!bookmarked}>
            <IconBookmark fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Answer choices" className="space-y-2">
        {order.map((key, i) => {
          const isSel = selected === key;
          const isCorrect = reveal && key === correctKey;
          const isWrong = reveal && isSel && key !== correctKey;
          const tone = isCorrect
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
            : isWrong
              ? 'border-red-500 bg-red-50 dark:bg-red-950/40'
              : isSel
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-800/60';
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSel}
              disabled={!onSelect}
              onClick={() => onSelect?.(key)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition disabled:cursor-default ${tone}`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${isSel || isCorrect ? 'border-current' : 'border-slate-400'} ${isCorrect ? 'text-emerald-600' : isWrong ? 'text-red-600' : isSel ? 'text-teal-600' : 'text-slate-400'}`}>
                {(isSel || isCorrect) && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
              </span>
              <span className="flex-1 text-[0.95rem] leading-snug text-slate-800 dark:text-slate-100">
                <span className="mr-2 font-bold text-slate-500 dark:text-slate-400">{LETTERS[i]}.</span>
                {q.options[key]}
              </span>
              {isCorrect && <span className="chip bg-emerald-600 text-white">Correct</span>}
              {isWrong && <span className="chip bg-red-600 text-white">Your answer</span>}
            </button>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-navy-800 dark:bg-navy-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy-800 dark:text-white">
              Correct answer: {correctDisplay}
              {correctKey ? ` — ${q.options[correctKey]}` : ''}
            </p>
            <Provenance q={q} />
          </div>
          {q.explanation ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{q.explanation}</p>
          ) : (
            <p className="text-sm italic text-slate-500">No explanation available for this question.</p>
          )}
          {q.aiConfidence === 'Low' && q.answerOrigin === 'ai_generated' && (
            <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">This answer was generated with low confidence. Please check it against your course material.</p>
          )}
          {showMeta && <p className="mt-3 text-xs text-slate-400">{q.source} · #{q.sourceNumber} · {q.subject}</p>}
        </div>
      )}
    </div>
  );
}
