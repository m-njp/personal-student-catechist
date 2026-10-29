---
name: release
description: Release staging to production by merging staging into main, which Vercel deploys. Use when the user says "release", "deploy", "ship it", "push to prod", or "merge staging to main".
---

# Release staging to main

`main` is production and Vercel deploys every change on it. Only `staging` is merged into `main`, through a pull request. The "Release guard" check fails any other source.

This machine runs Windows PowerShell 5.1 and has no `gh`. Run one command per line and do not use bash's `$(...)`. See `docs/workflow.md`.

## Steps

1. Check `staging` is healthy, and check its Vercel preview at phone and laptop width:

   ```bash
   git fetch origin --prune
   git switch staging
   git pull --ff-only
   npm run check
   ```

2. See what will go out. If nothing is listed, there is nothing to release: tell the user and stop.

   ```bash
   git log --oneline origin/main..origin/staging
   ```

3. Give the user this link to open the pull request (base `main`, head `staging`), titled `chore(release): <short summary>`, with the list from step 2 in the description:

   ```
   https://github.com/m-njp/personal-student-catechist/compare/main...staging?expand=1
   ```

   If the release adds a Vercel integration or environment variables, check they are set for Production before merging, or the live site errors where that feature is used.

4. Wait for CI and the Release guard.

5. Merge with **Create a merge commit** (not squash, not rebase), so `main` and `staging` share history and the next release has no conflicts.

6. Watch the production deployment in Vercel and open the live site.

Afterwards GitHub shows `staging` one commit behind `main`. That is normal. Never push to `staging` or `main` directly to "fix" it.
