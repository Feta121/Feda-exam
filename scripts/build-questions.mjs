// Converts data/question_bank.json (full extraction output) into the compact public/questions.json the app loads.
import fs from 'node:fs';
const bank = JSON.parse(fs.readFileSync(new URL('../data/question_bank.json', import.meta.url), 'utf8'));
const srcCode = { 1: 'A Comprehensive Review 1001', 2: 'Arba Minch Mock Exams 2025', 3: 'EHPLE Practice Test 2025', 4: "Lippincott's 1001" };
const out = bank.map((q) => ({
  id: q.id,
  question: q.question,
  options: q.options,
  answer: q.correct_answer || null,
  explanation: q.explanation || null,
  explanationOrigin: q.explanation_origin || null,
  answerOrigin: q.answer_origin || null,
  subject: q.subject,
  topic: q.topic || null,
  source: srcCode[q.source_file_no],
  sourceNumber: String(q.source_question_number),
  status: q.verification_status,
  duplicate: q.duplicate_status,
  duplicateOf: (q.duplicate_of || []).slice(0, 5).map((d) => d.id),
  flags: q.flags || [],
  directions: q.group ? q.group.directions : null,
  aiConfidence: q.ai_confidence || null,
  review: !!q.needs_manual_review,
}));
fs.mkdirSync(new URL('../public', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../public/questions.json', import.meta.url), JSON.stringify(out));
console.log(`Wrote public/questions.json with ${out.length} questions (${(fs.statSync(new URL('../public/questions.json', import.meta.url)).size / 1e6).toFixed(2)} MB)`);

fs.copyFileSync(new URL('../data/extraction_report.json', import.meta.url), new URL('../public/extraction_report.json', import.meta.url));
