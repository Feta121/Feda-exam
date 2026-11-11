# Update: Dashboard no longer stretches sideways on phones (10 files)

1. Unzip this update.
2. On your GitHub repository's FRONT PAGE: Add file -> Upload files.
3. Select everything inside the unzipped folder (CHANGELOG.md and the `src` folder) and drag it in once. Commit.
   (You can leave out HOW-TO-APPLY.md.) The commit should list 10 files.
4. Vercel -> Deployments: wait for "Ready", then reload the site. On your phone, close and reopen the tab (or clear the site data) so the new styles load.

| File | What changed |
|------|--------------|
| src/index.css | Every card may now shrink below the width of its content (the cause of the stretching) |
| src/pages/Dashboard.tsx | Shrinkable layout; long titles shorten with "..."; the score badge stays on one line |
| src/pages/Admin.tsx, ExamRun.tsx, ExamSetup.tsx, Practice.tsx, Subjects.tsx | Same shrinkable-layout fix, so other screens cannot stretch either |
| src/app.test.tsx, src/layout-guard.test.ts (new) | Tests (optional, not used by the website) |
| CHANGELOG.md | Notes |
