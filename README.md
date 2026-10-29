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

## More

- [docs/adding-a-lesson.md](docs/adding-a-lesson.md): add a lesson or a new kind of activity
- [docs/reflections-storage.md](docs/reflections-storage.md): where reflections are saved
- [docs/design.md](docs/design.md): design tokens, fonts, and rules
- [docs/game-saves.md](docs/game-saves.md): how a game's progress is saved
- [docs/workflow.md](docs/workflow.md): branches, commits, checks, and releases
- [tools/bayan-art/README.md](tools/bayan-art/README.md): the scripts that draw Lesson 2's town

Fonts: Geist, Geist Mono, and Geist Pixel (SIL Open Font License) and Sentient (ITF Free Font License), with licenses in `src/styles/fonts/`. Lesson 3 loads Baloo 2 and Atkinson Hyperlegible from Google Fonts. Lesson 3's art and sound credits are in `public/lessons/lesson-03/CREDITS.md`.
