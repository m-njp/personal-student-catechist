# Christian Living Classroom

A small website for teaching Grade 5 Christian Living. Open it on a laptop, show it on the TV, and teach. It also works on a phone.

## Run it

Install [Node.js](https://nodejs.org) 20 or newer, then in this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000. It goes straight to the newest lesson; the menu lists every lesson. On a phone on the same Wi-Fi, use the "Network" address shown in the terminal.

## Teach Lesson 1: Build Our Wall

1. Play the song from your own audio file. The website only links to it and does not play music.
2. Pupils pass the paper dove. When the music stops, the pupil holding it comes to the screen.
3. The pupil drags the numbered brick to the spot with the same number, or taps the spot. A wrong spot shakes the brick.
4. When the wall is full, the photo turns to full color and asks "Who built this?"
5. **Reset** or **Build again** starts over. The full screen button is for the TV.

After the lesson, pupils use **Write a reflection** in the menu, and you read them in **Read reflections**. Reflections are saved on the server, so they are still there after a reload. See `docs/reflections-storage.md` to connect it.

Visits are counted with Vercel Web Analytics, without cookies or names. Turn it on once in the Vercel project, under Analytics.

## Teach Lesson 5: A Journey to Remember

A recap walk past one memory of each earlier lesson, ending at the Church. Run the site from the laptop (`npm run dev`, or `npm run build` then `npm start`) so it works without internet: the game loads only files from this site.

1. Open Lesson 5 and press **Start the journey**. It fills the screen for the TV.
2. The pupil walks by themself, stopping for small moments along the road. At each memory the old scene replays, then the pupil asks its question.
3. The class answers aloud. Press Space, Enter, or click to reveal the answer. After a few seconds the walk goes on by itself.
4. After the fourth memory the pupil reaches the Church, everyone gathers, and the fiesta begins. Ask aloud: "Who is called to be holy?"

| Key | Does |
| --- | --- |
| Space, Enter, or a click | start, skip a replay, reveal the answer, or walk on |
| P | pause or resume |
| R | restart |
| M | sound off or on |
| 1 to 4, 5 | jump to a memory, or to the Church |

The same controls are buttons in the corners. Timing (walking speed, road lengths, replay and answer lengths) is `TIMING` at the top of `src/features/journey/Journey.ts`. The words are in `src/content/lessons/lesson-05/journey.ts`.

## More

- [docs/adding-a-lesson.md](docs/adding-a-lesson.md): add a lesson or a new kind of activity
- [docs/reflections-storage.md](docs/reflections-storage.md): where reflections are saved
- [docs/design.md](docs/design.md): design tokens, fonts, and rules
- [docs/game-saves.md](docs/game-saves.md): how a game's progress is saved
- [docs/workflow.md](docs/workflow.md): branches, commits, checks, and releases
- [tools/bayan-art/README.md](tools/bayan-art/README.md): the scripts that draw Lesson 2's town
- [tools/journey-art/README.md](tools/journey-art/README.md): the scripts that draw and score Lesson 5's journey

Fonts: Geist, Geist Mono, and Geist Pixel (SIL Open Font License) and Sentient (ITF Free Font License), with licenses in `src/styles/fonts/`. Lesson 3 loads Baloo 2 and Atkinson Hyperlegible from Google Fonts. Lesson 3's art and sound credits are in `public/lessons/lesson-03/CREDITS.md`. Lesson 5 uses Pixelify Sans, self-hosted by Next at build time.
