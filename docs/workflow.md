# Workflow

## Branches

| Branch | What it is | Changed by |
| --- | --- | --- |
| `main` | Production. Vercel deploys it. | A pull request from `staging` only |
| `staging` | Finished work collects here. Vercel gives it a preview link. | Pull requests from work branches |
| `feat/`, `fix/`, `docs/`, `refactor/`, `chore/` | One piece of work. Short-lived. | You |

```
feat/lesson-02 --PR (squash)--> staging --PR (merge commit)--> main --> Vercel production
```

1. **Start** from the latest `staging`: `git fetch origin --prune`, `git switch staging`, `git pull --ff-only`, `git switch -c feat/lesson-02`.
2. **Commit** with the format below. The hooks check each commit.
3. **Push** with `git push -u origin HEAD` and open a pull request into `staging` on GitHub. CI runs and Vercel posts a preview: check it on a phone and a laptop. Merge with **Squash and merge**.
4. **Release** with a pull request from `staging` into `main`, merged with **Create a merge commit**.

The skills `start-branch`, `commit`, `open-pr`, and `release` walk through each step.

## Commits

`type(scope): summary`. The scope is required, the first line is 72 characters or fewer, lower case, no period, no `Co-Authored-By`, no em dashes or emoji. The allowed types and scopes are in `.claude/skills/commit/SKILL.md`, and the `commit-msg` hook enforces them.

Commit finished work, not every tweak: a few commits per piece of work is plenty. To fold a forgotten change into an unpushed commit: `git add <files>`, `git commit --amend --no-edit`.

## Checks

| Where | What runs |
| --- | --- |
| `pre-commit` hook | blocks `main` and `staging`, then lint, typecheck, tests |
| `commit-msg` hook | the message format |
| `pre-push` hook | blocks `main` and `staging`, then the production build |
| GitHub Actions (`ci.yml`) | Lint, Typecheck, Test, Build on every push and pull request |
| GitHub Actions (`release-guard.yml`) | only `staging` may be merged into `main` |

`npm install` turns the hooks on (`.githooks/`). `npm run check` runs everything by hand. `--no-verify` skips the hooks in an emergency, but CI still runs.

## Adding a package

On Windows, `npm install <package>` drops optional lockfile entries that Linux needs, and CI then fails at `npm ci` with "Missing: @emnapi/core from lock file". Do not rebuild the lockfile from scratch: that drops the Linux binaries too. Instead:

```powershell
npm install <package>
node scripts/restore-lockfile-optionals.mjs
git diff --stat package-lock.json
```

The diff should only add lines. Commit `package.json` and the lockfile together.

## Windows and PowerShell problems

Development is on Windows PowerShell 5.1. The hooks run in Git Bash, but the commands you type do not.

| Problem | Fix |
| --- | --- |
| `&&` and `\|\|` are parse errors | One command per line, or `a; if ($?) { b }`. `npm run check` is fine: npm chains it itself. |
| `$(...)` and `VAR=1 cmd` are bash only | Use `$env:NAME = '1'; cmd; Remove-Item Env:NAME`, and put output in a variable first. |
| Red "NativeCommandError" from npm, vitest, or git | Usually a harmless warning on stderr. Do not add `2>&1`. Check `$LASTEXITCODE`. |
| `ConvertFrom-Json` fails on `package-lock.json` | Read it with `node -e`. |
| `gh` is not installed | Open pull requests from `https://github.com/m-njp/personal-student-catechist/compare/staging...<branch>?expand=1`. |
| A new branch starts behind | `git fetch origin --prune` and `git pull --ff-only` on `staging` first. |
| `git branch -d` says "not fully merged" | Squash merges do that. Confirm with `git merge-base --is-ancestor <branch> origin/main` (exit 0) or the merged pull request, then `git branch -D`. |
| "LF will be replaced by CRLF" | Harmless. `.gitattributes` keeps LF. Never save `.githooks/` files with CRLF. |
| Hook says `npm: command not found` | Hooks need Node on the system PATH. Repair Node, restart the terminal and editor. |
| History shows merge commits on `staging` | Choose **Squash and merge**, and set the ruleset's allowed method to Squash. |

To delete a finished branch, run `git branch -d <branch>` and `git push origin --delete <branch>`, never for `main` or `staging`. The `pre-push` hook builds first, so a delete takes a few seconds.

## One-time setup

**GitHub**, Settings, Rules, Rulesets, one per branch:

- `main`: restrict deletions, block force pushes, require a pull request (merge method: Merge), require `Lint`, `Typecheck`, `Test`, `Build`, `Only staging into main`, and up to date branches.
- `staging`: restrict deletions, block force pushes, require a pull request (merge method: Squash), require `Lint`, `Typecheck`, `Test`, `Build`.
- Settings, General: tick **Automatically delete head branches**.

**Vercel**: production branch `main`, preview deployments on for every other branch. Add the Upstash and Analytics integrations there (see `docs/reflections-storage.md`).
