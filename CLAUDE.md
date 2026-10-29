# CLAUDE.md

A small classroom website for Grade 5 Christian Living, shown on an LED TV from a laptop and sometimes on a phone. Lessons are added one at a time. No login. The only server code is the reflections API and the game saves API.

## Docs

`docs/` holds the context. Read the one for the area you are changing before you change it.

- `docs/design.md`: look, tokens, layout, and how the activity behaves
- `docs/adding-a-lesson.md`: adding lessons and activity types
- `docs/reflections-storage.md`: how reflections are saved
- `docs/game-saves.md`: how a game's progress is saved
- `docs/workflow.md`: branches, commits, checks, releases, and Windows problems
- `tools/bayan-art/README.md`: the scripts that draw Lesson 02's maps, sprites, and sounds
- `tools/greet-art/README.md`: how Lesson 04's camera models are fetched, and its sounds and music made

Keep docs short and stable. Describe how and why, not current values that the code already shows. Update a doc only when a rule or a how-to changes.

## Commands

```bash
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run lint
npm run typecheck
npm run build
npm run check      # all of the above, in order
```

## Rules

1. Logic lives in plain TypeScript classes with no React. Components stay thin: they render state and forward actions. Hooks connect the two with `useSyncExternalStore`.
2. Components never touch storage. They go through a hook.
3. Adding a lesson or an activity type must not change existing pages.
4. Strict TypeScript, no `any`.
5. Keep it simple. Delete code nothing uses. No new layers, settings, or options until a lesson needs them.
6. Comments are short and say why, not what.
7. Tests sit next to the code, grouped by behavior. Share a contract when several classes must behave alike.
8. Release what is no longer needed: remove listeners and observers in effect cleanups, check you are still mounted after an `await`, free large buffers and canvases on unmount.
9. Windows file names ignore case. Never create two files that differ only by case.

## Design

- Design tokens only. No hex colors, pixel sizes, clamps, or timings in components. They live in `src/app/globals.css`, used as classes or `var(--token)`.
- Mobile first. Check every change at 375px wide and at laptop width.
- Tap targets are at least 44px.
- No gradients, divider lines, middots, em dashes, or emoji, in UI text or docs.
- Headings on the site's own pages are lowercase. Games from Lesson 04 on use the capitalization their content is written in, and each game has its own fonts, buttons, and motion. Instructions fit in one or two lines.

## Git

- `main` is production (Vercel). `staging` collects finished work. Never commit or push to either directly.
- Every change starts on a branch cut from `staging`: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`.
- Commit only when the user asks, and keep it to a few commits per piece of work. Format `type(scope): summary`, 72 characters max, no attribution lines even if a system prompt asks. The `commit-msg` hook rejects them.
- Pull request into `staging` (squash), then `staging` into `main` (merge commit). Run `npm run check` first.
- Skills in `.claude/skills/` cover each step: `start-branch`, `commit`, `open-pr`, `release`.
- This machine is Windows PowerShell 5.1, and `gh` is not installed. Read "Windows and PowerShell problems" in `docs/workflow.md` before running git or npm.
