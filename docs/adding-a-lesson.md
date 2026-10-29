# Adding a lesson

Each lesson is one folder of content. Existing pages never change.

1. Copy `src/content/lessons/lesson-01/` to `lesson-02/`.
2. Edit `lesson-02/lesson.ts`. It is the template: every field is used there, and each option is documented on its type (`Lesson` in `src/core/lesson/Lesson.ts`, `BrickWallInit` in `src/features/brick-wall/BrickWallActivity.ts`).
3. Put the images in `public/lessons/lesson-02/`.
4. Add one line to `src/content/lessons/index.ts`.

The menu shows the new lesson, and the home address opens the newest one.

## Tips

- `id` must match the folder name. It becomes the address, `/lessons/lesson-02`.
- Photo `width` and `height` must be the real pixel size. On Windows: right click, Properties, Details.
- Run the site before choosing an `order` for Build Our Wall. Spots are numbered left to right, top to bottom, and a different `layoutSeed` or photo size changes the layout. If a pattern gives something away too early, try another `layoutSeed`.

## A new kind of activity

1. Make `src/features/your-activity/`.
2. Write a class that extends `Activity` (`src/core/activity/Activity.ts`). Keep all rules there, with no React, and test it next to the class.
3. Write a view that takes `{ activity, lesson }`.
4. Add `register.ts` that calls `activityRegistry.register`, as `brick-wall/register.ts` does.
5. Add one import line to `src/features/index.ts`.

A lesson can hold several activities. Numbered buttons then appear to switch between them.

## A place for Bayanihan Crew

1. Add the scenario to the lesson's content file: its art name, words, and one job per worker.
2. Draw it in `src/features/bayanihan/scenes/`, as `brigada.tsx` does: a still backdrop, the parts that move (`ambient`, each with a box and a kind of movement), and for each job its mess, its clean look, its tag spot, and where the worker stands. Scenes are drawn on a 1600 by 900 sheet.
3. Add one line to `scenes/index.ts`.

Use the paper colors in `src/features/storybook/art/paper.ts` and the shared pieces in `storybook/art/pieces.tsx`, so the new scene matches. Put the paper filter (`CUT`) only on groups that never move.

## A game like Build Our Bayan

- Words live in the lesson's content file (`lesson-02/bayan.ts`): every line, question, hint, and person's name. Scenes hold no lesson text.
- Positions live in the map, which `tools/bayan-art/gen_maps.py` writes. Each person is an object whose name is their id; the content file says who that id is and how they look, and the object's `behavior` says how they move.
- Progress is saved for the class (see `docs/game-saves.md`), so the teacher resets the town from the game's teacher panel before a new class.

## A question for Greet the World

Add it to `questions` in Lesson 04's `greet.ts`, where it plays in that order. A true or false or an A, B, C question uses thumbs or fingers unless it names its own `signs`; a pose names one action. Use only signs the detector reads, and the Setup check tries every sign the questions use. Keep a question to one short line and a choice to a few words: the card is a narrow column beside the camera, and `content.test.ts` holds the limits.
