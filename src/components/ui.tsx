import { useEffect, type ReactNode } from 'react';
import type { Question } from '../types';
import { IconX } from './icons';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-navy-800 dark:text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'teal' }: { value: number; tone?: 'teal' | 'amber' | 'red' }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber2-500' : 'bg-teal-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-semibold text-navy-800 dark:text-white">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900 dark:text-white">{title}</h2>
          <button className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tells the student where an answer and explanation came from. */
export function Provenance({ q }: { q: Question }) {
  const ai = q.answerOrigin === 'ai_generated';
  const aiExp = q.explanationOrigin === 'ai_generated';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ai ? (
        <span className="chip bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" title="The source PDF had no answer key; the answer was generated and has not been verified">
          AI-generated answer{q.aiConfidence ? ` · ${q.aiConfidence.toLowerCase()} confidence` : ''}
        </span>
      ) : q.answerOrigin === 'admin' && q.status === 'admin_verified' ? (
        <span className="chip bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Verified by admin</span>
      ) : q.answerOrigin === 'admin' ? (
        <span className="chip bg-slate-200 text-slate-700 dark:bg-navy-800 dark:text-slate-300">Edited by admin, not yet verified</span>
      ) : q.status === 'source_key_needs_review' ? (
        <span className="chip bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Answer key under review</span>
      ) : (
        <span className="chip bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Answer from source</span>
      )}
      {aiExp && <span className="chip bg-slate-200 text-slate-700 dark:bg-navy-800 dark:text-slate-300">AI-written explanation</span>}
    </div>
  );
}

export function Select({ value, onChange, children, label }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}
