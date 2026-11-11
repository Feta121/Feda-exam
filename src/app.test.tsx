// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AppProvider } from './state/AppContext';
import type { Question } from './types';
import { filterPool, isPlayable } from './lib/exam';

const BANK: Question[] = JSON.parse(readFileSync('public/questions.json', 'utf8'));
const PLAYABLE = BANK.filter(isPlayable);
const SOURCES = JSON.parse(readFileSync('public/sources.json', 'utf8')) as { id: string; match: string; name: string; titles: string[] }[];
const LIPP = "Lippincott's 1001";
const enc = encodeURIComponent;

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
async function ready(path = '/') {
  const r = mount(path);
  await flush();
  await flush();
  return r;
}
const click = (el: HTMLElement) => act(async () => { fireEvent.click(el); });
const btn = (name: RegExp | string) => screen.getByRole('button', { name });

const strip = (t: string) => t.replace(/^[A-H]\.\s*/, '').trim();
/** Identify a displayed question by its stem AND its option texts (several bank questions share the same opening words). */
function identify(stem: string, opts: HTMLElement[]): Question {
  const shown = opts.map((o) => strip(o.textContent!));
  const cands = BANK.filter((x) => stem.includes(x.question.trim().slice(0, 60)));
  const exact = cands.find((x) => stem.endsWith(x.question.trim()) && shown.every((t) => Object.values(x.options).some((v) => v.trim() === t)));
  const loose = cands.find((x) => shown.every((t) => Object.values(x.options).some((v) => v.trim() === t)));
  const q = exact ?? loose ?? cands[0];
  if (!q) throw new Error('question on screen not found in bank: ' + stem.slice(0, 80));
  return q;
}

/** Finds the question currently on screen and returns it with the displayed option buttons. */
function current(): { q: Question; opts: HTMLElement[] } {
  const radios = screen.getAllByRole('radio');
  const stem = radios[0].closest('div[role="radiogroup"]')!.parentElement!.querySelector('p.font-serif')!.textContent!;
  return { q: identify(stem, radios), opts: radios };
}
function pageQuestions(): { q: Question; opts: HTMLElement[] }[] {
  return screen.getAllByRole('radiogroup').map((g) => {
    const stem = g.parentElement!.querySelector('p.font-serif')!.textContent!;
    const opts = within(g as HTMLElement).getAllByRole('radio');
    return { q: identify(stem, opts), opts };
  });
}
const textOf = (o: HTMLElement) => o.textContent!.replace(/^[A-H]\.\s*/, '').trim();
const clickCorrect = async () => {
  const { q, opts } = current();
  const el = opts.find((o) => textOf(o) === q.options[q.answer!].trim())!;
  await click(el);
};

async function startExam(count: number, minutes?: number, perPage = 1) {
  await ready('/exam');
  await click(btn(String(count)));
  fireEvent.change(screen.getByLabelText(/questions per page/i), { target: { value: String(perPage) } });
  if (minutes) fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: String(minutes) } });
  await click(btn(/start exam/i));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => (String(url).includes('sources.json') ? SOURCES : BANK) })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('loading screen', () => {
  it('shows the full logo picture while the question bank is downloading', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined))); // never resolves
    mount('/');
    await flush();
    expect(screen.getByAltText(/anesthesia mock exam by abdulfetah/i).getAttribute('src')).toContain('brand.png');
    expect(screen.getByText(/loading question bank/i)).toBeTruthy();
  });
});

describe('dashboard on a narrow phone', () => {
  it('long exam titles shrink with an ellipsis and the score badge never wraps, so the page cannot stretch sideways', async () => {
    const t = Date.now();
    localStorage.setItem('ame:attempts', JSON.stringify([{ id: 'a1', title: 'A Comprehensive Review 1001 – General Anesthesia exam with a really long extra title', mode: 'source', startedAt: t - 600_000, finishedAt: t, durationSec: 1200, timeTakenSec: 600, total: 20, correct: 8, incorrect: 12, unanswered: 0, percent: 40, passMark: 50, passed: false, autoSubmitted: false, items: [] }]));
    await ready('/');
    const title = screen.getByText(/A Comprehensive Review 1001 – General Anesthesia exam with a really long/);
    expect(title.className).toMatch(/\btruncate\b/);
    expect(title.parentElement!.className).toMatch(/\bmin-w-0\b/);
    const badge = screen.getByText(/8\/20 · 40%/);
    expect(badge.className).toMatch(/\bshrink-0\b/);
    expect(badge.className).toMatch(/\bwhitespace-nowrap\b/);
    const row = screen.getByText('Recent results').closest('div.grid')!;
    expect(row.className).toContain('grid-cols-[minmax(0,1fr)]'); // the column can shrink to the phone width
    expect(screen.getByText('Study progress').closest('section')!.parentElement).toBe(row); // both cards share that column
  });
});

describe('dashboard', () => {
  it('shows real totals from the question bank', async () => {
    await ready('/');
    expect(screen.getByText('Anesthesia Mock Exam', { selector: 'h1' })).toBeTruthy();
    expect(screen.getByText(PLAYABLE.length.toLocaleString())).toBeTruthy();
    expect(screen.getByText(/had no answer key in the source PDFs/i)).toBeTruthy();
  });
});

describe('mock exam', () => {
  it('hides answers during the exam, then scores 100% when every correct option is chosen (even with shuffled options)', async () => {
    await startExam(20);
    expect(screen.queryByText(/correct answer:/i)).toBeNull();
    expect(screen.getByText(/question 1 of 20/i)).toBeTruthy();
    for (let i = 0; i < 20; i++) {
      await clickCorrect();
      expect(screen.queryByText(/correct answer:/i)).toBeNull(); // still hidden
      if (i < 19) await click(btn(/^next/i));
    }
    await click(btn(/^finish/i));
    expect(screen.getByText(/you have answered/i).textContent).toContain('20');
    await click(btn(/submit now/i));
    await flush();
    expect(screen.getByText('20/20', { exact: false })).toBeTruthy();
    expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0);
    expect(screen.getByText('PASS')).toBeTruthy();
    // result is persisted and the in-progress exam is cleared
    expect(JSON.parse(localStorage.getItem('ame:attempts')!)).toHaveLength(1);
    expect(localStorage.getItem('ame:session')).toBeNull();
    // review shows the explanation and correct answer for each question
    expect(screen.getAllByText(/correct answer:/i).length).toBe(20);
  });

  it('counts unanswered and wrong answers and supports flagging and the navigator', async () => {
    await startExam(20);
    await clickCorrect();                           // Q1 correct
    await click(btn(/^next/i));
    const { q, opts } = current();                 // Q2 wrong
    const wrong = opts.find((o) => textOf(o) !== q.options[q.answer!].trim())!;
    await click(wrong);
    await click(btn(/flag question 2 for review/i));
    expect(screen.getByRole('button', { name: /question 2 flagged/i }).getAttribute('aria-pressed')).toBe('true');
    // navigator reflects state
    const nav = screen.getByText(/question navigator/i).parentElement!;
    expect(within(nav).getByLabelText(/question 1, answered/i)).toBeTruthy();
    expect(within(nav).getByLabelText(/question 2, answered, flagged/i)).toBeTruthy();
    expect(within(nav).getByLabelText(/question 3, unanswered/i)).toBeTruthy();
    await click(btn(/^submit$/i));
    expect(screen.getByText(/18 questions are unanswered/i)).toBeTruthy();
    await click(btn(/submit now/i));
    await flush();
    const text = document.body.textContent!;
    expect(text).toContain('1/20');
    expect(text).toMatch(/Incorrect\s*1/);
    expect(text).toMatch(/Unanswered\s*18/);
    expect(text).toContain('FAIL');
  });

  it('survives a page reload: answers, flags, position and the countdown are restored', async () => {
    await startExam(20, 30);
    await clickCorrect();
    await click(btn(/^next/i));
    await clickCorrect();
    await click(btn(/flag question 2 for review/i));
    cleanup(); // simulate closing the tab; localStorage remains
    await ready('/exam/run');
    expect(screen.getByText(/question 2 of 20 · 2 answered/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /question 2 flagged/i })).toBeTruthy();
    const timer = screen.getByRole('timer').textContent!;
    expect(timer).toMatch(/^(29|30):\d\d$/);
  });

  it('submits automatically when the time runs out and records it', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    await startExam(20, 1);
    await clickCorrect();
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole('timer').textContent).toBe('00:30');
    await act(async () => { vi.advanceTimersByTime(31_000); });
    await flush();
    expect(screen.getByText(/submitted automatically when time ran out/i)).toBeTruthy();
    const attempts = JSON.parse(localStorage.getItem('ame:attempts')!);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ autoSubmitted: true, correct: 1, unanswered: 19, total: 20 });
    expect(attempts[0].timeTakenSec).toBeLessThanOrEqual(60);
  });

  it('an exam left open past its end time is submitted when the page is reopened', async () => {
    await startExam(20, 1);
    await clickCorrect();
    const s = JSON.parse(localStorage.getItem('ame:session')!);
    s.endsAt = Date.now() - 5_000; // the browser was closed and time elapsed
    localStorage.setItem('ame:session', JSON.stringify(s));
    cleanup();
    await ready('/exam/run');
    await flush();
    expect(JSON.parse(localStorage.getItem('ame:attempts')!)[0].autoSubmitted).toBe(true);
  });

  it('random exams differ each time and never repeat a question', async () => {
    const ids: string[][] = [];
    for (let k = 0; k < 2; k++) {
      localStorage.removeItem('ame:session');
      await startExam(50);
      ids.push(JSON.parse(localStorage.getItem('ame:session')!).questionIds);
      cleanup();
    }
    expect(new Set(ids[0]).size).toBe(50);
    expect(ids[0]).not.toEqual(ids[1]);
  });
});

describe('practice mode', () => {
  it('shows the result the moment an option is clicked (no submit step) and records it', async () => {
    await ready('/practice');
    expect(screen.queryByText(/correct answer:/i)).toBeNull(); // nothing revealed before choosing
    expect(screen.queryByRole('button', { name: /submit answer/i })).toBeNull(); // there is no submit button any more
    await clickCorrect();
    expect(screen.getByText(/correct answer:/i)).toBeTruthy(); // result, correct option and explanation appear on the click itself
    expect(screen.getAllByText('Correct').length).toBeGreaterThan(0);
    const log = JSON.parse(localStorage.getItem('ame:log')!);
    expect(log).toHaveLength(1);
    expect(log[0].correct).toBe(true);
  });

  it('marks a wrong click in red, shows the right answer, and locks the choice', async () => {
    await ready('/practice');
    const { q, opts } = current();
    await click(opts.find((o) => textOf(o) !== q.options[q.answer!].trim())!);
    expect(screen.getByText('Your answer')).toBeTruthy();
    expect(screen.getByText(/correct answer:/i)).toBeTruthy();
    // clicking another option afterwards must not change or re-record the answer
    await click(screen.getAllByRole('radio')[0]);
    await click(screen.getAllByRole('radio')[1]);
    const log = JSON.parse(localStorage.getItem('ame:log')!);
    expect(log).toHaveLength(1);
    expect(log[0].correct).toBe(false);
    expect(btn(/next question|finish/i)).toBeTruthy();
  });

  it('wrong answers feed the weak-area analysis and the wrong-answers list', async () => {
    await ready('/practice?subject=Pharmacology');
    for (let i = 0; i < 6; i++) {
      const { q, opts } = current();
      const wrong = opts.find((o) => textOf(o) !== q.options[q.answer!].trim())!;
      await click(wrong);
      await click(btn(/next question|finish/i));
    }
    cleanup();
    await ready('/weak');
    expect(screen.getByText('Recommended focus')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Pharmacology\s*·\s*0%/);
    cleanup();
    await ready('/saved');
    await click(btn(/wrong answers \(6\)/i));
    expect(document.querySelectorAll('li.card').length).toBe(6);
  });
});

describe('practice: the Next button is easy to reach', () => {
  it('lives in a pinned bar above the question, not under the explanation', async () => {
    await ready('/practice');
    const bar = screen.getByRole('region', { name: /practice controls/i });
    expect(within(bar).getByRole('button', { name: /^skip$/i })).toBeTruthy(); // before answering: Skip, no Next
    expect(screen.queryByRole('button', { name: /next question/i })).toBeNull();
    await clickCorrect();
    expect(within(bar).getByRole('button', { name: /next question|finish/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /next question|finish/i })).toHaveLength(1); // no second copy at the bottom
    const card = document.getElementById('practice-card')!;
    expect(bar.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // bar comes before the question
    expect(bar.className).toContain('sticky');
  });

  it('Enter and the right arrow move to the next question once the answer is shown', async () => {
    await ready('/practice');
    fireEvent.keyDown(window, { key: 'Enter' }); // nothing happens before an answer is chosen
    expect(screen.getByText(/question 1 of/i)).toBeTruthy();
    await clickCorrect();
    await act(async () => { fireEvent.keyDown(window, { key: 'Enter' }); });
    expect(screen.getByText(/question 2 of/i)).toBeTruthy();
    expect(screen.queryByText(/correct answer:/i)).toBeNull();
    await clickCorrect();
    await act(async () => { fireEvent.keyDown(window, { key: 'ArrowRight' }); });
    expect(screen.getByText(/question 3 of/i)).toBeTruthy();
  });
});

describe('bookmarks and history', () => {
  it('bookmarks a question and lists it under Saved', async () => {
    await ready('/practice');
    await click(btn(/bookmark question/i));
    cleanup();
    await ready('/saved');
    expect(document.querySelectorAll('li.card').length).toBe(1);
  });
});

describe('administration', () => {
  it('is locked for students, unlocks with the passcode and persists an edited answer key', async () => {
    await ready('/admin');
    expect(screen.getByLabelText(/admin passcode/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/admin passcode/i), { target: { value: 'wrong' } });
    await click(btn(/sign in/i));
    expect(screen.getByText(/incorrect passcode/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/admin passcode/i), { target: { value: 'admin' } });
    await click(btn(/sign in/i));
    expect(screen.getByRole('button', { name: /add question/i })).toBeTruthy();
    // edit the first question in the list
    await click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
    const dialog = screen.getByRole('dialog');
    const radios = within(dialog).getAllByRole('radio');
    await click(radios[1]);
    await click(within(dialog).getByLabelText(/mark answer and explanation as verified/i));
    await click(within(dialog).getByRole('button', { name: /^save$/i }));
    const saved = JSON.parse(localStorage.getItem('ame:overrides')!);
    const [o] = Object.values(saved) as { answer: string; verified: boolean }[];
    expect(o.answer).toBe('B');
    expect(o.verified).toBe(true);
  });

  it('students cannot reach the editor without unlocking', async () => {
    await ready('/admin');
    expect(screen.queryByRole('button', { name: /add question/i })).toBeNull();
  });
});

describe('exam header on a phone', () => {
  it('keeps every header item on a single line so text cannot scatter into a column', async () => {
    await startExam(20, undefined, 5);
    const header = document.querySelector('header')!;
    const progress = within(header).getByText(/questions 1–5 of 20 · 0 answered/i);
    expect(progress.className).toMatch(/truncate/);
    expect(progress.className).toMatch(/whitespace-nowrap/);
    expect(btn(/^submit$/i).className).toMatch(/whitespace-nowrap/);
    expect(btn(/^questions$/i).className).toMatch(/whitespace-nowrap/);
    expect(screen.getByRole('timer').className).toMatch(/whitespace-nowrap/);
    expect(within(header).getByText(/random mock exam/i).className).toMatch(/truncate/);
  });
});

describe('questions per page', () => {
  it('defaults to 5 per page on the exam setup screen', async () => {
    await ready('/exam');
    expect((screen.getByLabelText(/questions per page/i) as HTMLSelectElement).value).toBe('5');
  });

  it('shows 5 questions per page by default, pages through the exam, and scores correctly', async () => {
    await ready('/exam');
    await click(btn('20'));
    await click(btn(/start exam/i));
    expect(screen.getAllByRole('radiogroup')).toHaveLength(5);
    expect(screen.getByText(/questions 1–5 of 20/i)).toBeTruthy();
    expect(screen.getByText(/page 1 of 4/i)).toBeTruthy();
    expect(screen.queryByText(/correct answer:/i)).toBeNull();
    for (let page = 0; page < 4; page++) {
      for (const { q, opts } of pageQuestions()) await click(opts.find((o) => textOf(o) === q.options[q.answer!].trim())!);
      expect(screen.queryByText(/correct answer:/i)).toBeNull();
      if (page < 3) await click(btn(/^next/i));
    }
    expect(screen.getByText(/questions 16–20 of 20/i)).toBeTruthy();
    await click(btn(/^finish/i));
    await click(btn(/submit now/i));
    await flush();
    expect(screen.getByText('20/20', { exact: false })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ame:attempts')!)[0]).toMatchObject({ correct: 20, total: 20, perPage: 5 });
  });

  it('honours other page sizes, with a shorter final page', async () => {
    await startExam(20, undefined, 3);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3);
    for (let i = 0; i < 6; i++) await click(btn(/^next/i)); // pages 2..7
    expect(screen.getByText(/questions 19–20 of 20/i)).toBeTruthy();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^next/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^finish/i })).toBeTruthy();
    await click(btn(/^previous/i));
    expect(screen.getByText(/questions 16–18 of 20/i)).toBeTruthy();
  });

  it('the navigator jumps to the page that holds the chosen question', async () => {
    await ready('/exam');
    await click(btn('20'));
    await click(btn(/start exam/i));
    const nav = screen.getByText(/question navigator/i).parentElement!;
    await click(within(nav).getByLabelText(/question 12, unanswered/i));
    expect(screen.getByText(/questions 11–15 of 20/i)).toBeTruthy();
    expect(document.getElementById('q-11')).toBeTruthy();
    expect(within(nav).getByLabelText(/question 13, unanswered/i).getAttribute('aria-current')).toBe('true'); // whole page highlighted
    expect(within(nav).getByLabelText(/question 3, unanswered/i).getAttribute('aria-current')).toBe('false');
  });

  it('flags individual questions on a multi-question page', async () => {
    await ready('/exam');
    await click(btn('20'));
    await click(btn(/start exam/i));
    await click(btn(/flag question 3 for review/i));
    const nav = screen.getByText(/question navigator/i).parentElement!;
    expect(within(nav).getByLabelText(/question 3, unanswered, flagged/i)).toBeTruthy();
    expect(within(nav).getByLabelText(/question 2, unanswered$/i)).toBeTruthy();
  });

  it('a reload keeps the page and the page size', async () => {
    await ready('/exam');
    await click(btn('20'));
    await click(btn(/start exam/i));
    const { q, opts } = pageQuestions()[0];
    await click(opts.find((o) => textOf(o) === q.options[q.answer!].trim())!);
    await click(btn(/^next/i));
    cleanup();
    await ready('/exam/run');
    expect(screen.getByText(/questions 6–10 of 20 · 1 answered/i)).toBeTruthy();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(5);
  });

  it('a page size chosen once is remembered for the next exam', async () => {
    await ready('/exam');
    fireEvent.change(screen.getByLabelText(/questions per page/i), { target: { value: '10' } });
    cleanup();
    await ready('/exam');
    expect((screen.getByLabelText(/questions per page/i) as HTMLSelectElement).value).toBe('10');
  });
});

describe('sources page', () => {
  const expected = (source: string, topic?: string) => filterPool(BANK, { includeAi: true }).filter((q) => q.source === source && (!topic || q.topic === topic));

  it('lists every source with a first-page picture and is reachable from the menu', async () => {
    await ready('/sources');
    await flush();
    expect(screen.getAllByAltText(/^first page of /i)).toHaveLength(5);
    for (const s of SOURCES) expect(screen.getByRole('heading', { name: s.name })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /^sources$/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('34 questions', { exact: true })).toBeTruthy(); // the Word document
  });

  it('on a phone the description and buttons span the full card, under the picture (and sit beside it on wide screens)', async () => {
    await ready('/sources');
    await flush();
    for (const src of SOURCES) {
      const body = screen.getByTestId(`body-${src.id}`);
      expect(body.className).toMatch(/\bcol-span-2\b/); // full width on phones
      expect(body.className).toMatch(/\bsm:col-span-1\b/); // back beside the picture from the sm breakpoint
      expect(body.className).toMatch(/\bsm:col-start-2\b/);
      expect(within(body).getByRole('link', { name: /^practise all$/i })).toBeTruthy();
      expect(within(body).getByRole('link', { name: /^mock exam$/i })).toBeTruthy();
      expect(within(body).getByRole('button', { name: /^show titles$/i })).toBeTruthy();
    }
  });

  it('tapping the picture lists the chapter titles with counts, and tapping again hides them', async () => {
    await ready('/sources');
    await flush();
    const pic = screen.getByRole('button', { name: /show titles of lippincott/i });
    expect(pic.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/chapters in this source/i)).toBeNull();
    await click(pic);
    expect(screen.getByText(/chapters in this source \(21\)/i)).toBeTruthy();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(21);
    const counts = items.map((li) => Number(li.textContent!.match(/\((\d+)\)/)![1]));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(PLAYABLE.filter((q) => q.source === LIPP).length);
    await click(screen.getByRole('button', { name: /hide titles of lippincott/i }));
    expect(screen.queryByText(/chapters in this source/i)).toBeNull();
  });

  it('a title opens practice limited to exactly that title', async () => {
    await ready('/sources');
    await flush();
    await click(screen.getByRole('button', { name: /show titles of lippincott/i }));
    await click(screen.getByRole('link', { name: /^practise airway management$/i }));
    await flush();
    const want = expected(LIPP, 'Airway Management');
    expect(want.length).toBeGreaterThan(10);
    expect(screen.getByText(new RegExp(`question 1 of ${want.length}$`, 'i'))).toBeTruthy();
    const { q } = current();
    expect(q.source).toBe(LIPP);
    expect(q.topic).toBe('Airway Management');
  });

  it('a source with no titles says so and offers its subjects instead', async () => {
    await ready('/sources');
    await flush();
    await click(screen.getByRole('button', { name: /show titles of ehple/i }));
    expect(screen.getByText(/has no chapter titles of its own/i)).toBeTruthy();
    const chip = screen.getAllByRole('link', { name: /^practise .* from ehple/i })[0];
    expect(chip.getAttribute('href')).toContain('subject=');
    expect(chip.getAttribute('href')).toContain('source=EHPLE');
  });

  it('practice can be limited to one source, and the new Word-document questions are usable', async () => {
    await ready(`/practice?source=${enc("Seniors' Questions")}`);
    const want = expected("Seniors' Questions");
    expect(want).toHaveLength(34);
    expect(screen.getByText(new RegExp(`question 1 of 34$`, 'i'))).toBeTruthy();
    await clickCorrect();
    expect(screen.getByText(/correct answer:/i)).toBeTruthy();
    expect(screen.getByText('Answer from source')).toBeTruthy();
    expect(current === undefined).toBe(false);
  });

  it('a mock exam can be built from one source, or from one title of a source', async () => {
    await ready(`/exam?mode=source&source=${enc("Seniors' Questions")}`);
    await click(btn(/^all/i));
    await click(btn(/start exam/i));
    let ids: string[] = JSON.parse(localStorage.getItem('ame:session')!).questionIds;
    expect(ids).toHaveLength(34);
    expect(ids.every((id) => id.startsWith('SEN-'))).toBe(true);
    cleanup();
    localStorage.removeItem('ame:session');
    await ready(`/exam?mode=source&source=${enc(LIPP)}&topic=${enc('Airway Management')}`);
    await click(btn('20'));
    await click(btn(/start exam/i));
    ids = JSON.parse(localStorage.getItem('ame:session')!).questionIds;
    const byId = new Map(BANK.map((q) => [q.id, q]));
    expect(ids).toHaveLength(20);
    expect(ids.every((id) => byId.get(id)!.source === LIPP && byId.get(id)!.topic === 'Airway Management')).toBe(true);
  });

  it('titles in sources.json match the topics in the question bank exactly', () => {
    for (const s of SOURCES) {
      const topics = new Set(BANK.filter((q) => q.source === s.match && q.topic).map((q) => q.topic));
      expect(new Set(s.titles)).toEqual(topics);
      expect(BANK.some((q) => q.source === s.match)).toBe(true);
    }
  });
});

describe('shared cases ("Questions 55 to 58: A 30-year-old ...")', () => {
  const CASE_IDS = ['LIPP-17-55', 'LIPP-17-56', 'LIPP-17-57', 'LIPP-17-58'];
  const CASE = BANK.find((q) => q.id === 'LIPP-17-55')!.context!;
  const above = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  function seed(ids: string[], perPage = 5) {
    const now = Date.now();
    const byId = new Map(BANK.map((q) => [q.id, q]));
    localStorage.setItem('ame:session', JSON.stringify({ id: 'exam-seeded', mode: 'mock', title: 'Case test', createdAt: now, endsAt: now + 3_600_000, durationSec: 3600, questionIds: ids, perPage, optionOrder: Object.fromEntries(ids.map((id) => [id, Object.keys(byId.get(id)!.options).sort()])), answers: {}, flagged: [], index: 0 }));
  }

  it('the data: 20 groups, 65 questions, every member carries the identical case, nothing left in the options', () => {
    const withCtx = BANK.filter((q) => q.context);
    expect(withCtx).toHaveLength(65);
    const groups = new Map<string, Question[]>();
    for (const q of withCtx) groups.set(q.context!, [...(groups.get(q.context!) ?? []), q]);
    expect(groups.size).toBe(20);
    for (const members of groups.values()) {
      const nums = members.map((q) => Number(q.id.split('-')[2])).sort((a, b) => a - b);
      expect(new Set(members.map((q) => q.id.split('-')[1])).size).toBe(1); // same chapter
      expect(nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)).toBe(true); // consecutive questions
      expect(members[0].context!.length).toBeGreaterThan(100);
    }
    const marker = /Questions?\s+\d+\s*(to|through|-|–|and)\s*\d+/i;
    for (const q of BANK) for (const t of [q.question, ...Object.values(q.options)]) expect(marker.test(t)).toBe(false);
    expect(CASE).toMatch(/^A 30-year-old otherwise-healthy G2P0 \(167 cm, 68 kg\) presents at 34¹ weeks/);
    expect(CASE_IDS.every((id) => BANK.find((q) => q.id === id)!.context === CASE)).toBe(true);
    expect(BANK.find((q) => q.id === 'LIPP-17-54')!.options.D).toBe('Induces severe hypertension'); // the question before the group is clean
  });

  it('every question of the case shows the case above it, wherever it lands after shuffling, and others show none', async () => {
    seed(['LIPP-17-57', 'EHPLE-001', 'LIPP-17-55', 'LIPP-17-58', 'LIPP-17-56']);
    await ready('/exam/run');
    const boxes = [...document.querySelectorAll('blockquote')];
    expect(boxes).toHaveLength(4);
    for (const b of boxes) {
      expect(b.textContent).toContain(CASE);
      expect(above(b, b.closest('section')!.querySelector('[role="radiogroup"]')!)).toBe(true);
    }
    expect(document.getElementById('q-1')!.querySelector('blockquote')).toBeNull(); // EHPLE-001 has no case
  });

  it('a question that appears alone still brings its case with it', async () => {
    seed(['LIPP-17-57'], 1);
    await ready('/exam/run');
    expect(document.querySelectorAll('blockquote')).toHaveLength(1);
    expect(screen.getByText('Case for this question')).toBeTruthy();
    expect(document.querySelector('blockquote')!.textContent).toContain('single footling in breech presentation');
  });

  it('the results review shows the case with each question', async () => {
    seed(CASE_IDS, 5);
    await ready('/exam/run');
    await click(btn(/^submit$/i));
    await click(btn(/submit now/i));
    await flush();
    const boxes = [...document.querySelectorAll('blockquote')];
    expect(boxes).toHaveLength(4);
    expect(boxes.every((b) => b.textContent!.includes(CASE))).toBe(true);
  });

  it('practice shows the case above the question', async () => {
    await ready(`/practice?source=${enc(LIPP)}&topic=${enc('Obstetric Anesthesia')}`);
    let bq: Element | null = null;
    for (let i = 0; i < 90 && !(bq = document.querySelector('blockquote')); i++) {
      await clickCorrect();
      await click(btn(/next question|finish/i));
    }
    expect(bq).toBeTruthy();
    const { q } = current();
    expect(q.context).toBeTruthy();
    expect(bq!.textContent).toContain(q.context!);
    expect(above(bq!, screen.getByRole('radiogroup'))).toBe(true);
  });

  it('an administrator can edit the shared case of a question', async () => {
    await ready('/admin');
    fireEvent.change(screen.getByLabelText(/admin passcode/i), { target: { value: 'admin' } });
    await click(btn(/sign in/i));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'all' } });
    fireEvent.change(screen.getByPlaceholderText('ID or text'), { target: { value: 'single footling' } });
    expect(screen.getByText('LIPP-17-57')).toBeTruthy(); // found only through its case: its own text does not contain the words
    fireEvent.change(screen.getByPlaceholderText('ID or text'), { target: { value: 'LIPP-17-55' } });
    await click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
    const dialog = screen.getByRole('dialog');
    const box = within(dialog).getByLabelText(/shared case/i) as HTMLTextAreaElement;
    expect(box.value).toContain('G2P0');
    fireEvent.change(box, { target: { value: box.value + ' EDITED' } });
    await click(within(dialog).getByRole('button', { name: /^save$/i }));
    const saved = Object.values(JSON.parse(localStorage.getItem('ame:overrides')!)) as { context: string }[];
    expect(saved).toHaveLength(1);
    expect(saved[0].context).toMatch(/G2P0.*EDITED$/);
  });
});
