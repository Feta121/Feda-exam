# How to apply this update (only the changed files)

Every file here sits in the same folder path as in your project. Upload each one to the SAME folder in your GitHub repo (it replaces the old copy), then Vercel republishes by itself.

| File in this update            | Open this folder in your GitHub repo | What changed |
|--------------------------------|--------------------------------------|--------------|
| index.html                     | (repo root, the front page)          | Light theme default + instant loading splash with the full logo |
| CHANGELOG.md                   | (repo root)                          | Notes only (optional) |
| src/App.tsx                    | src                                  | Uses the new loading screen |
| src/index.css                  | src                                  | Loading-bar animation |
| src/components/LoadingScreen.tsx | src/components                     | NEW file: loading screen with the full logo |
| src/pages/ExamRun.tsx          | src/pages                            | Fixed top bar on phones |
| src/app.test.tsx               | src                                  | Tests (optional, not used by the website) |
| src/theme.test.ts              | src                                  | NEW tests (optional, not used by the website) |

## Steps
1. Go to your repository on github.com.
2. For each row: click into the folder shown in the third column (for the root, stay on the front page).
3. Click Add file -> Upload files, drag that one file in, type a short message, click Commit changes.
   (You will do this for 5 places: root, src, src/components, src/pages. The two test files are optional.)
4. Open vercel.com -> your project -> Deployments. A new deployment appears and shows "Building" then "Ready" (about a minute).
5. Open feda-quali-prep.vercel.app on your phone. If you still see the old version, close the tab and reopen it, or clear the site data for that address.

You do not need to change any Vercel setting for this update.
