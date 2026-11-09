# Update: seniors' questions + Sources page (24 files)

Every file sits in the same folder path as in your GitHub repo. Uploading replaces the old copy (or adds the new file), then Vercel republishes by itself.

## Fastest way (one go)
1. Unzip this update.
2. Go to your repository's FRONT PAGE on github.com (not inside any folder).
3. Add file -> Upload files.
4. Open the unzipped folder, select everything inside it (CHANGELOG.md, README.md, and the folders data, pipeline, public, scripts, src) and drag it all in at once.
   Leave out HOW-TO-APPLY.md if you like (it is only these instructions).
5. Commit changes. Open the commit afterwards: it should list 24 files (about 8 MB, the biggest is data/question_bank.json at 4.5 MB, well inside GitHub's limits).
6. In Vercel -> your project -> Deployments, wait for "Ready" (about a minute), then reload feda-quali-prep.vercel.app.
   If the old version still shows, close the tab and reopen it, or clear the site data for that address.

## What is in it
| File | What changed |
|------|--------------|
| public/questions.json | Question bank now includes the 34 new questions (SEN-001..SEN-034) |
| public/sources.json | NEW: the list of sources, their descriptions and titles for the Sources page |
| public/sources/*.jpg | NEW: the first-page picture of each of the 5 sources |
| public/extraction_report.json, data/extraction_report.json | Updated counts |
| data/question_bank.json | Full bank including the new questions (used only when rebuilding) |
| src/pages/Sources.tsx | NEW: the Sources page |
| src/pages/Practice.tsx | New Source filter |
| src/pages/ExamSetup.tsx | New "By source" exam type |
| src/pages/History.tsx | Shows "Source" as an exam type |
| src/App.tsx, src/components/Layout.tsx, src/components/icons.tsx | New menu item and route for Sources |
| src/types.ts | New types for sources and the source exam type |
| src/app.test.tsx | 13 new tests (optional, not used by the website) |
| scripts/build-questions.mjs | Knows the new source |
| pipeline/add_seniors.py, pipeline/build_sources.py | NEW: the scripts used to add the questions and build the sources list (optional) |
| CHANGELOG.md, README.md | Notes |

Nothing needs changing in Vercel's settings. Your logo files are unchanged.
