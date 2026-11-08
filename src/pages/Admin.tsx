import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useApp, adminConfigured } from '../state/AppContext';
import { EmptyState, Modal, PageHeader, Select } from '../components/ui';
import { signIn, signUp } from '../lib/cloud';
import type { Question, QuestionOverride } from '../types';

type Tab = 'questions' | 'duplicates' | 'import' | 'report';
type Filter = 'all' | 'review' | 'ai' | 'nokey' | 'unverified' | 'figure' | 'duplicates' | 'hidden';
const PAGE = 25;

function Gate() {
  const { cloudEnabled, user, unlockAdmin, signOut, refreshUser } = useApp();
  const [pass, setPass] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  if (!adminConfigured)
    return (
      <div>
        <PageHeader title="Administration" />
        <EmptyState title="Admin access is not configured">
          Set <code>VITE_ADMIN_PASSCODE</code> for a local passcode, or connect Supabase (<code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>) and give your account the admin role. See the README.
        </EmptyState>
      </div>
    );
  if (cloudEnabled && user)
    return (
      <div>
        <PageHeader title="Administration" />
        <EmptyState title="Your account is not an administrator">Ask an existing administrator to set your role to <code>admin</code>.<div className="mt-4"><button className="btn-ghost" onClick={() => void signOut()}>Sign out</button></div></EmptyState>
      </div>
    );
  const submit = async (e: FormEvent, signup = false) => {
    e.preventDefault();
    setMsg(null);
    try {
      if (cloudEnabled) {
        if (signup) await signUp(email, pass); else await signIn(email, pass);
        await refreshUser();
        if (signup) setMsg('Account created. Check your email if confirmation is required.');
      } else if (!unlockAdmin(pass)) setMsg('Incorrect passcode');
    } catch (err) {
      setMsg((err as Error).message);
    }
  };
  return (
    <div>
      <PageHeader title="Administration" subtitle="Sign in to manage the question bank." />
      <form onSubmit={(e) => void submit(e)} className="card max-w-sm space-y-3 p-5">
        {cloudEnabled && (<label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>)}
        <label className="block"><span className="label">{cloudEnabled ? 'Password' : 'Admin passcode'}</span><input className="input" type="password" autoComplete={cloudEnabled ? 'current-password' : 'off'} value={pass} onChange={(e) => setPass(e.target.value)} required /></label>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <div className="flex gap-2"><button className="btn-primary flex-1" type="submit">Sign in</button>{cloudEnabled && <button className="btn-ghost" type="button" onClick={(e) => void submit(e as unknown as FormEvent, true)}>Sign up</button>}</div>
      </form>
    </div>
  );
}

function Editor({ q, onClose }: { q: Question | null; onClose: () => void }) {
  const { saveOverride, subjects, overrides } = useApp();
  const isNew = q === null;
  const [text, setText] = useState(q?.question ?? '');
  const [opts, setOpts] = useState<[string, string][]>(q ? Object.entries(q.options) : [['A', ''], ['B', ''], ['C', ''], ['D', '']]);
  const [answer, setAnswer] = useState(q?.answer ?? '');
  const [expl, setExpl] = useState(q?.explanation ?? '');
  const [subject, setSubject] = useState(q?.subject ?? subjects[0] ?? 'Other');
  const [topic, setTopic] = useState(q?.topic ?? '');
  const [hidden, setHidden] = useState(!!(q && overrides[q.id]?.hidden));
  const [verified, setVerified] = useState(isNew || q?.status === 'admin_verified');
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const options = Object.fromEntries(opts.filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
    if (!text.trim()) return setErr('The question text is required');
    if (Object.keys(options).length < 2) return setErr('At least two answer options are required');
    if (!answer || !(answer in options)) return setErr('Choose the correct answer from the options above');
    const o: QuestionOverride = {
      id: q?.id ?? `CUSTOM-${Date.now().toString(36)}`, question: text.trim(), options, answer, explanation: expl.trim() || null,
      subject, topic: topic.trim() || null, hidden, verified, custom: isNew || q?.id.startsWith('CUSTOM-') || undefined, updatedAt: Date.now(),
    };
    try {
      await saveOverride(o);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add question' : `Edit ${q!.id}`}>
      <div className="space-y-3">
        <label className="block"><span className="label">Question</span><textarea className="input min-h-[96px]" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div>
          <span className="label">Options (select the correct one)</span>
          <div className="space-y-2">
            {opts.map(([k, v], i) => (
              <div key={k} className="flex items-center gap-2">
                <input type="radio" name="ans" className="h-4 w-4 accent-teal-600" checked={answer === k} onChange={() => setAnswer(k)} aria-label={`Option ${k} is correct`} />
                <span className="w-5 text-sm font-bold">{k}</span>
                <input className="input" value={v} onChange={(e) => setOpts(opts.map((o, j) => (j === i ? [k, e.target.value] : o)))} />
                <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => { setOpts(opts.filter((_, j) => j !== i)); if (answer === k) setAnswer(''); }} aria-label={`Remove option ${k}`}>×</button>
              </div>
            ))}
          </div>
          {opts.length < 8 && <button type="button" className="mt-2 text-sm font-semibold text-teal-600" onClick={() => setOpts([...opts, ['ABCDEFGH'[opts.length] ?? String(opts.length + 1), '']])}>+ Add option</button>}
        </div>
        <label className="block"><span className="label">Explanation</span><textarea className="input min-h-[96px]" value={expl} onChange={(e) => setExpl(e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">Subject</span><input className="input" list="subjects" value={subject} onChange={(e) => setSubject(e.target.value)} /><datalist id="subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist></label>
          <label className="block"><span className="label">Topic</span><input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={verified} onChange={(e) => setVerified(e.target.checked)} />Mark answer and explanation as verified by an administrator</label>
        {!isNew && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />Hide from students (remove from exams and practice)</label>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => void save()}>Save</button></div>
      </div>
    </Modal>
  );
}

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const { admin, lockAdmin, questions, overrides, saveOverride, subjects, hiddenIds, byId, cloudEnabled, signOut } = useApp();
  const [tab, setTab] = useState<Tab>('questions');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('review');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Question | null | undefined>(undefined);
  const [report, setReport] = useState<Record<string, any> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => { if (admin && tab === 'report' && !report) fetch(`${import.meta.env.BASE_URL}extraction_report.json`).then((r) => r.json()).then(setReport).catch(() => setReport({})); }, [admin, tab, report]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (subject && q.subject !== subject) return false;
      if (filter === 'review' && !q.review) return false;
      if (filter === 'ai' && q.answerOrigin !== 'ai_generated') return false;
      if (filter === 'nokey' && q.answer) return false;
      if (filter === 'unverified' && (q.status === 'source_key_verified' || q.status === 'admin_verified')) return false;
      if (filter === 'figure' && !q.flags.some((f) => f.includes('figure'))) return false;
      if (filter === 'duplicates' && q.duplicate !== 'exact' && q.duplicate !== 'likely') return false;
      if (filter === 'hidden' && !hiddenIds.has(q.id)) return false;
      return !s || q.id.toLowerCase().includes(s) || q.question.toLowerCase().includes(s);
    });
  }, [questions, search, filter, subject, hiddenIds]);
  useEffect(() => setPage(0), [search, filter, subject]);

  const dupPairs = useMemo(() => {
    const out: [Question, Question][] = [];
    questions.forEach((q) => { if (q.duplicate === 'exact' || q.duplicate === 'likely') q.duplicateOf.forEach((d) => { const o = byId.get(d); if (o && q.id < d) out.push([q, o]); }); });
    return out;
  }, [questions, byId]);

  if (!admin) return <Gate />;

  const toggleHide = (q: Question) => saveOverride({ ...(overrides[q.id] ?? { id: q.id }), id: q.id, hidden: !hiddenIds.has(q.id), updatedAt: Date.now() }).catch((e: Error) => alert(e.message));

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('The file must contain a JSON array of questions');
      let ok = 0; const bad: string[] = [];
      for (const [i, r] of data.entries()) {
        const opts = r?.options && typeof r.options === 'object' ? (r.options as Record<string, unknown>) : {};
        const options = Object.fromEntries(Object.entries(opts).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, String(v).trim()]));
        if (typeof r?.question !== 'string' || !r.question.trim() || Object.keys(options).length < 2 || !(r.answer in options)) { bad.push(`#${i + 1}`); continue; }
        await saveOverride({ id: `CUSTOM-${Date.now().toString(36)}${i}`, question: r.question.trim(), options, answer: r.answer, explanation: r.explanation || null, subject: r.subject || 'Other', topic: r.topic || null, custom: true, verified: false, updatedAt: Date.now() });
        ok++;
      }
      setImportMsg(`Imported ${ok} question${ok === 1 ? '' : 's'}.${bad.length ? ` Skipped ${bad.length} invalid: ${bad.slice(0, 15).join(', ')}.` : ''} Imported questions are unverified until you mark them verified.`);
    } catch (e) {
      setImportMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  const tabs: [Tab, string][] = [['questions', 'Questions'], ['duplicates', `Duplicates (${dupPairs.length})`], ['import', 'Import / export'], ['report', 'Extraction report']];
  return (
    <div>
      <PageHeader title="Administration" subtitle="Review, correct and extend the question bank." actions={<><button className="btn-primary" onClick={() => setEditing(null)}>Add question</button><button className="btn-ghost" onClick={() => (cloudEnabled ? void signOut() : lockAdmin())}>Lock</button></>} />
      {!cloudEnabled && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">Local mode: edits are saved in this browser only and the passcode is not real security. Connect Supabase to share edits with every student and enforce admin-only access.</p>}
      <div className="mb-4 flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-slate-200 dark:border-navy-800'}`}>{l}</button>)}</div>

      {tab === 'questions' && (
        <>
          <div className="card mb-4 grid gap-3 p-4 md:grid-cols-3">
            <label className="block"><span className="label">Search</span><input className="input" placeholder="ID or text" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <Select label="Show" value={filter} onChange={(v) => setFilter(v as Filter)}>
              <option value="review">Needs manual review</option><option value="ai">AI-generated answers</option><option value="nokey">No answer key</option><option value="unverified">Not verified</option><option value="figure">Needs a figure</option><option value="duplicates">Likely duplicates</option><option value="hidden">Hidden</option><option value="all">All questions</option>
            </Select>
            <Select label="Subject" value={subject} onChange={setSubject}><option value="">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}</Select>
          </div>
          <p className="mb-2 text-sm text-slate-500">{list.length.toLocaleString()} questions</p>
          <ul className="space-y-2">
            {list.slice(page * PAGE, (page + 1) * PAGE).map((q) => (
              <li key={q.id} className="card flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm">{q.question || <em className="text-slate-400">(no text)</em>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="chip bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300">{q.id}</span>
                    <span className="chip bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300">{q.subject}</span>
                    {q.answerOrigin === 'ai_generated' && <span className="chip bg-amber-100 text-amber-900">AI answer{q.aiConfidence ? ` · ${q.aiConfidence}` : ''}</span>}
                    {!q.answer && <span className="chip bg-red-100 text-red-800">no key</span>}
                    {q.review && <span className="chip bg-red-100 text-red-800">review</span>}
                    {hiddenIds.has(q.id) && <span className="chip bg-slate-300 text-slate-800">hidden</span>}
                    {q.duplicate !== 'none' && <span className="chip bg-navy-100 text-navy-800">{q.duplicate} duplicate</span>}
                    {q.flags.filter((f) => f !== 'maybe_figure').slice(0, 2).map((f) => <span key={f} className="chip bg-slate-100 text-slate-500 dark:bg-navy-800">{f.replace(/_/g, ' ').slice(0, 40)}</span>)}
                  </div>
                </div>
                <button className="btn-ghost shrink-0 !py-1" onClick={() => setEditing(q)}>Edit</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-sm text-slate-500">Page {page + 1} of {Math.max(1, Math.ceil(list.length / PAGE))}</span>
            <button className="btn-ghost" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}

      {tab === 'duplicates' && (dupPairs.length === 0 ? <EmptyState title="No exact or likely duplicates" /> : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Nothing is deleted automatically. Hide one copy to remove it from exams, or leave both.</p>
          {dupPairs.slice(0, 100).map(([a, b]) => (
            <div key={a.id + b.id} className="card grid gap-3 p-4 md:grid-cols-2">
              {[a, b].map((q) => (
                <div key={q.id}>
                  <p className="text-xs text-slate-500">{q.id} · {q.source}</p>
                  <p className="my-1 line-clamp-4 text-sm">{q.question}</p>
                  <p className="text-xs text-slate-500">Answer: {q.answer ? `${q.answer}. ${q.options[q.answer]}` : 'none'}</p>
                  <div className="mt-2 flex gap-2"><button className="btn-ghost !py-1" onClick={() => setEditing(q)}>Edit</button><button className="btn-ghost !py-1" onClick={() => void toggleHide(q)}>{hiddenIds.has(q.id) ? 'Unhide' : 'Hide this copy'}</button></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {tab === 'import' && (
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-bold">Import questions</h2>
            <p className="mt-1 text-sm text-slate-500">Upload a JSON array. Each item needs <code>question</code>, <code>options</code> (an object such as {'{"A":"…","B":"…"}'}) and <code>answer</code> (an option key). <code>explanation</code>, <code>subject</code> and <code>topic</code> are optional.</p>
            <input type="file" accept="application/json,.json" className="mt-3 text-sm" onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} />
            {importMsg && <p className="mt-3 text-sm">{importMsg}</p>}
          </section>
          <section className="card p-5">
            <h2 className="font-bold">Export</h2>
            <p className="mt-1 text-sm text-slate-500">Download the current bank with every edit applied, or only the edits. To publish edits permanently, replace <code>data/question_bank.json</code> and rebuild (see the README).</p>
            <div className="mt-3 flex gap-2"><button className="btn-ghost" onClick={() => download('question_bank_current.json', questions)}>Export full bank ({questions.length})</button><button className="btn-ghost" onClick={() => download('question_edits.json', overrides)}>Export edits only ({Object.keys(overrides).length})</button></div>
          </section>
        </div>
      )}

      {tab === 'report' && (report === null ? <p className="text-sm text-slate-500">Loading…</p> : !report.per_file ? <EmptyState title="Report not available" /> : (
        <div className="space-y-4">
          <section className="card overflow-x-auto p-5">
            <h2 className="mb-3 font-bold">Extraction by source PDF</h2>
            <table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">PDF</th><th className="text-right">Extracted</th><th className="text-right">Source key</th><th className="text-right">No key</th><th className="text-right">Needs review</th></tr></thead>
              <tbody>{Object.entries(report.per_file as Record<string, Record<string, number>>).map(([n, v]) => <tr key={n} className="border-t border-slate-100 dark:border-navy-800"><td className="py-2">{n}</td><td className="text-right tabular-nums">{v.extracted}</td><td className="text-right tabular-nums">{v.with_source_answer_key}</td><td className="text-right tabular-nums">{v.without_key}</td><td className="text-right tabular-nums">{v.needs_manual_review}</td></tr>)}</tbody></table>
            <p className="mt-3 text-sm text-slate-500">Total {report.ai_generation?.total_questions ?? report.total} questions · {report.ai_generation?.answers_generated ?? 0} answers and {report.ai_generation?.explanations_generated ?? 0} explanations are AI-generated · duplicates: {report.duplicates?.exact ?? 0} exact, {report.duplicates?.likely ?? 0} likely, {report.duplicates?.possible ?? 0} possible.</p>
          </section>
        </div>
      ))}

      {editing !== undefined && <Editor key={editing?.id ?? 'new'} q={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
