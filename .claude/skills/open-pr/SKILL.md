---
name: open-pr
description: Open a pull request from a feature branch into staging once the work is committed and pushed. Use when the user says "open a PR", "merge this", "send it to staging", or a feature branch is ready for review.
---

# Open a pull request into staging

Feature branches always go into `staging`, never straight into `main`.

This machine runs Windows PowerShell 5.1 and has no `gh`. Run one command per line, and use the compare link in step 4. See `docs/workflow.md`.

## Steps

1. Make sure the branch is ready: `git branch --show-current` is not `main` or `staging`, `git status --short` is empty, and `npm run check` passes.

2. Bring in the latest `staging`, resolve any conflicts, run `npm run check` again, and commit the merge:

   ```bash
   git fetch origin
   git merge origin/staging
   ```

3. Push:

   ```bash
   git push -u origin HEAD
   ```

4. Give the user this link to open the pull request in the browser (replace the branch name):

   ```
   https://github.com/m-njp/personal-student-catechist/compare/staging...feat/lesson-02?expand=1
   ```

   Fill in the template: what changed, why, and the checklist. If the change needs something set up outside the code, such as a Vercel integration or environment variable, say so, for Production and Preview.

5. Wait for the four CI checks (Lint, Typecheck, Test, Build) and the Vercel preview. Check the preview at phone and laptop width.

6. Merge with **Squash and merge**, with a title in the commit format, for example `feat(lesson-02): add the sharing circle activity`. Then delete the branch.

7. Update locally:

   ```bash
   git fetch origin --prune
   git switch staging
   git pull --ff-only
   git branch -d feat/lesson-02
   ```

   After a squash merge, `git branch -d` says "not fully merged". If the pull request shows Merged, use `git branch -D feat/lesson-02`.
