export type Origin = 'source' | 'ai_generated' | 'admin' | null;

export interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string | null;
  explanation: string | null;
  explanationOrigin: Origin;
  answerOrigin: Origin;
  subject: string;
  topic: string | null;
  source: string;
  sourceNumber: string;
  status: string;
  duplicate: 'none' | 'possible' | 'likely' | 'exact';
  duplicateOf: string[];
  flags: string[];
  directions: string | null;
  aiConfidence: 'High' | 'Medium' | 'Low' | null;
  review: boolean;
}

/** Edits made by an administrator; applied on top of the shipped question bank. */
export interface QuestionOverride {
  id: string;
  question?: string;
  options?: Record<string, string>;
  answer?: string | null;
  explanation?: string | null;
  subject?: string;
  topic?: string | null;
  hidden?: boolean;
  verified?: boolean;
  /** Present when an administrator added a brand-new question (or imported one). */
  custom?: boolean;
  updatedAt: number;
}

export type ExamMode = 'mock' | 'random' | 'subject' | 'source' | 'wrong' | 'bookmarks';

export interface ExamSession {
  id: string;
  mode: ExamMode;
  title: string;
  subject?: string;
  createdAt: number;
  endsAt: number;
  durationSec: number;
  questionIds: string[];
  /** How many questions are shown on one screen (older saved exams without this field show one). */
  perPage?: number;
  /** For each question: the order in which the ORIGINAL option keys are displayed. */
  optionOrder: Record<string, string[]>;
  /** Selected ORIGINAL option key per question. */
  answers: Record<string, string>;
  flagged: string[];
  index: number;
}

export interface AttemptItem {
  qid: string;
  selected: string | null;
  correct: boolean | null;
  flagged: boolean;
  optionOrder: string[];
}

export interface Attempt {
  id: string;
  title: string;
  mode: ExamMode;
  subject?: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  timeTakenSec: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percent: number;
  passMark: number;
  passed: boolean;
  autoSubmitted: boolean;
  perPage?: number;
  items: AttemptItem[];
}

export interface AnswerLog {
  qid: string;
  correct: boolean;
  ts: number;
  mode: 'practice' | ExamMode;
}

export interface Settings {
  passMark: number;
  includeAi: boolean;
  perPage: number;
}

/** One entry of public/sources.json: a book or document the questions were taken from. */
export interface SourceMeta {
  id: string;
  /** Exactly the value of Question.source for this source. */
  match: string;
  name: string;
  byline: string;
  kind: string;
  pages: number;
  cover: string;
  about: string;
  /** What the source calls its titles (for example "Chapters"), or null when it has none. */
  titleLabel: string | null;
  /** Titles in the order they appear in the source. They equal Question.topic values. */
  titles: string[];
}
