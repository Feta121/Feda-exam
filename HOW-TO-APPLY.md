# Update: Sources page layout on phones (3 files)

1. Unzip this update.
2. On your GitHub repository's FRONT PAGE: Add file -> Upload files.
3. Select everything inside the unzipped folder (the CHANGELOG.md file and the `src` folder) and drag it in once. Commit.
4. Vercel -> Deployments: wait for "Ready", then reload the site (close and reopen the tab on your phone if it still shows the old layout).

| File | What changed |
|------|--------------|
| src/pages/Sources.tsx | On phones, the description and the three buttons span the full card under the picture. Wide screens look the same as before. |
| src/app.test.tsx | One new test for this layout (optional, not used by the website) |
| CHANGELOG.md | Notes |
