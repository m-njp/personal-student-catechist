# Design

Quiet, warm, and clear. The photo is the hero, controls stay small, and the color reveal at the end is the biggest moment.

## Tokens

Every color, size, shadow, and timing lives in `src/app/globals.css`. Never write a hex color, pixel size, or clamp in a component: add or change a token.

- Tokens in `@theme` become Tailwind classes (`--color-ink` is `text-ink`, `--spacing-panel` is `w-panel`).
- Tokens in `:root` are for styles set from code, used as `var(--name)`.
- Canvas code cannot use classes. It reads tokens with `readToken()` from `src/lib/tokens.ts`.
- Colors are `paper`, `ink`, `muted`, `hairline`, `wash`, `gold`, `coral`. Gold and coral are too light for text: use them for shapes only. Shadows are mixed from `ink`.
- Reduced motion is handled in the tokens. Components need no checks.

## Fonts

| Use | Font |
| --- | --- |
| Headings | Geist Pixel (`.pixel`) |
| UI and body | Geist |
| The wall's question | Geist Mono (`font-mono`) |
| Reflection text | Sentient (`font-serif`) |
| Lesson 03's games | Baloo 2 (`font-story`) and Atkinson Hyperlegible (`font-story-body`), loaded from Google Fonts and set only on the games' frame |

The self-hosted font files and licenses are in `src/styles/fonts/`.

Each lesson's game has its own fonts, buttons, and motion, chosen for its story, so no two games look alike.

## Rules

- No gradients. No divider lines: use space and card borders. The lesson list's tree lines are the one exception.
- No middots, em dashes, or emoji. Headings on the site's own pages are lowercase; a game from Lesson 04 on uses the capitalization its content is written in.
- Tap targets are at least 44px.
- Cards are `rounded-2xl border border-hairline` with generous padding.
- Mobile first: every screen works at 375px, then grows for laptop (`lg`) and TV.

## Layout

- Laptop and TV: a slim lesson list on the left, content on the right. On the activity, the wall fills the height and the controls sit in a narrow column beside it.
- Phone: a top bar whose menu opens a small card under the button, never the whole screen.
- Full screen (the TV): the wall is centered and the controls float in a small card that folds away. Where the browser has no Fullscreen API, the activity covers the window.
- The activity screen never scrolls. Other pages do.

## Build Our Wall

- The photo is cut into a repeatable mix of squares, lying bricks, and standing bricks, so no finished area gives the picture away.
- It plays like a puzzle. Spots and bricks are numbered, bricks come in a fixed order, and each fits only its own spot. A wrong spot refuses it with a small shake.
- The brick rests small in a fixed-size tray. Picked up, it grows to its spot's exact size and follows the pointer. The tray never changes size, so the wall never jumps on a phone.
- Filled spots are halftone dots. When the wall is full, the color photo fades in and the question appears on one line across the bottom.
- Music is played separately, so the panel is only Reset and full screen.

## Build Our Bayan

A pixel town on Phaser and grid-engine, with every word drawn by React over the canvas so it stays sharp and readable on a TV.

- Who does what: `BayanRules` holds the rules for all five stages, `Director` runs the story, two zustand stores hold the saved progress and what is on screen, and the scenes only draw. The scenes hear "now" moments through one small `EventBus`, and tell the Director when a building has finished rising. Every building, the church too, rises in Stage 1. Stage 2 reveals the standing church instead of building it: a close-up over the game shows its foundation, walls, and capstone dark, and each right answer lights one with its name, so the lesson reads from across the room.
- Buildings rise from a change in saved progress, so a refresh draws the town as it is and a change made elsewhere still animates. A teacher's jump or reset marks the save not ready for a moment, so the town is redrawn at once instead.
- The teacher can restart the current stage or reset the whole town. Stage 5's promises are the groups' saved reflections, so resetting the town, or restarting Stage 5, takes them down first. If that fails nothing changes and the panel says so.
- A building going up is the reward, so it takes its time, and the story waits for its card before going on.
- Guidance comes in layers: the guide's lines at the start of each stage, the quest card, an arrow over the next place to go, marks over who is next, the Talk button, and the controls reminder. Nobody else talks unless spoken to, so the screen stays quiet.
- Where the pupil can go is always clear: walkable ground has a faint grid, a mouse outlines the tile it points at, and a blocked tile shows a red X when tapped or walked into.
- Every wrong choice has its own reply, so a second wrong pick gets a new nudge.
- Everyone has an id (their object's name in the map) and a behavior, so no two move alike. A new habit is one entry in `town/Behaviors.ts`. Townsfolk and animals never block the pupil. Under reduced motion the jeepney stays parked.
- The camera frames the town or the church and never zooms out past what fills the screen with the map, so no empty space shows on a wide screen.
- Text sizes come from the game area (a size container), so the same page reads well on a phone and from the back of a classroom.
- Pixels stay square: the canvas is drawn at device pixels and the camera zooms by whole numbers when it can. Too small to read, the camera follows the pupil instead.
- Layer depths live in `game/depth.ts` and overlay looks in `overlay/styles.ts`, so nothing is set twice.
- The maps, sprites, and sounds are generated by the scripts in `tools/bayan-art`. Change a script and run it; edits made by hand to the files it writes are lost on the next run.
- Stage 5 saves each group's sentence as a reflection under the group's name, so it uses the reflections API and shows on the lesson's reflection wall too.

## The paper storybook (Lesson 03)

Two games that look like colored paper pinned to a classroom board. Bayanihan Crew opens the lesson, and Gift Quest closes it.

- Each game opens on a cover with its name, its cast, and one Play button. Play fills the screen, so the TV shows only the game, and the tap lets the browser play sound.
- People are round paper tokens: an Open Peeps face from DiceBear, a ring in their gift's color, and the gift's badge. The bust is used as drawn; a body under it looked stitched on. The same gift color and icon mark the person's card, badge, and job tag, so a pupil matches picture to picture.
- Faces show what a person is doing, so the class reads the moment without words. The few expressions allowed are listed in `cast.ts`, and each face is drawn once per hair and expression and kept.
- Each game's rules are a pure step function (`rules.ts`) that returns the new progress and what happened. `StoryActivity` makes the saved game from them, and `StoryPlay` is the shell both games share. Only progress is saved; what is clean or placed is worked out from it. Each start of a scene or gift counts up an `attempt`, so a replay starts fresh too.
- `StoryBoard` is the frame both boards share: who is talking and the progress on top, the game below. Every word, the teacher panel's too, comes from the lesson's content file.
- One scene engine draws every Bayanihan Crew place from data: the content names the jobs and the words, and the scene's art module holds the backdrop, the parts that move, each job's mess and clean layers, where its tag is pinned, and where the worker stands to work.
- The places are alive, so a still screen never looks frozen: small things in each scene move on a loop, the crew bobs while waiting, and each worker says a short line and moves their tool while working.
- Progress always shows, so the class knows how far they have come.
- Every right answer is rewarded at once: a sparkle burst, a sound, and a line from Marco. Letters pop into their boxes, the word bounces green, and the piece flies into the picture.
- Paper shadows are an SVG filter, so only still layers use it. Each mess, clean, and moving layer is its own small picture whose wrapper fades or moves, and tokens move by transform only, so nothing that moves is redrawn.
- Drag uses the pointer's position, so a tag under the finger is the one that counts. Tapping a friend and then a job does the same, and is the keyboard path. On a phone, job targets show their gift icons at least 44px wide, with the full job name available to screen readers. In Gifts for Our Barangay, typing letters and Backspace work too.
- Feedback is spoken in one line that screen readers hear. Wrong answers cost nothing: Marco gives the job's picture as a hint, the letter boxes shake and clear, and a bad use of a gift asks the class to choose again.
- Under reduced motion the hops and fades are skipped and tokens jump straight to their place.

## Greet the World (Lesson 04)

A camera quiz. Two groups play at once, one player each: Player 1 on the left in blue, Player 2 on the right in orange. Square paper panels and black ink; blue and orange belong to the players only. Bebas Neue for headings, IBM Plex Sans for reading, Space Mono for labels, self-hosted in `src/styles/fonts/greet`.

- The class sits behind the players, so the detector reads only people standing close: shoulders smaller than the player size are never read, a locked player can only be followed by someone about as close, and a hand counts only when it is big enough for the player beside it. The teacher can tune the player size in the panel.
- The camera stays quiet: a joint-dotted skeleton in each player's color, nobody else drawn, and a numbered tag over each head showing the sign the camera sees and a bar that fills while it is held.
- A match plays every question in `greet.ts` in order and runs by itself: each card shows with a 3, 2, 1, its timer starts, and the result shows before the next card. Teacher keys and buttons answer through the same path as the camera. A faster right answer scores more.
- Each question names its answer signs, so a true or false can be thumbs, or a smile and a surprised face. Every sign the questions use is tried one at a time in Setup, with the seconds held and a chime when it passes.
- The final round uses the two tracked players. Each holds two open palms to light their own half of the globe. Both players must be present and confirmed.
- Music plays under a match; short sounds mark the countdown, the start, each result, and the finish. The clips and music come from `tools/greet-art`. The camera runtime and models are not committed: `npm run dev` and `npm run build` fetch them there, checked against pinned hashes.
- Inference runs in a worker with one frame in flight. Stale results never count. Hand ownership is one-to-one with visible player wrists, and all meters use the same time-based confirmation as scoring.
- No picture or landmark leaves the laptop. Only scores and settings are saved, on this laptop.

## Performance

Release what is no longer needed, the way Flutter widgets clean up in `dispose`.

- The halftone reads a small copy of the photo, shared while a wall is on screen and dropped when the last one leaves.
- A slot frees its canvas when emptied or removed.
- The color photo starts loading after the first brick.
- Every listener, observer, and timer is removed in the effect cleanup. After an `await`, check you are still mounted.
- Lesson pages are built ahead of time, so they open instantly.
- The game loads only in the browser and is destroyed when its page closes. All games on the page share one audio context, because browsers allow only a few.
