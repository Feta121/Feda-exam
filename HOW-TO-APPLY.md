# Update: shared cases ("Questions 55 to 58: A 30-year-old ...") shown with every question (12 files)

1. Unzip this update.
2. On your GitHub repository's FRONT PAGE: Add file -> Upload files.
3. Select everything inside the unzipped folder (CHANGELOG.md, README.md and the folders data, pipeline, public, scripts, src) and drag it in once. Commit.
   (You can leave out HOW-TO-APPLY.md.) The commit should list 12 files; the biggest is data/question_bank.json at about 4.6 MB.
4. Vercel -> Deployments: wait for "Ready", then reload the site (close and reopen the tab on your phone if it still looks the same).

| File | What changed |
|------|--------------|
| public/questions.json | The 65 questions that belong to a shared case now carry the case text; the case text was removed from the answer options it had stuck to |
| data/question_bank.json | Same, in the full data file (used only when rebuilding) |
| src/components/QuestionView.tsx | Shows the case above the question (exam, practice, results review) |
| src/types.ts, src/state/AppContext.tsx | The new "case" field |
| src/pages/Admin.tsx | "Shared case" box in the question editor; search also looks inside cases |
| scripts/build-questions.mjs | Copies the new field into the website's data file |
| pipeline/add_context.py | NEW: the script that found and attached the cases (optional) |
| src/app.test.tsx, src/lib/exam.test.ts | Tests (optional, not used by the website) |
| CHANGELOG.md, README.md | Notes |

Nothing needs changing in Vercel's settings.
