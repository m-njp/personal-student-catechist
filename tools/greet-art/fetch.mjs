// Copies the Kenney sound clips (CC0) from tools/greet-art/packs/, where each pack's zip is unzipped by hand.
// Run from the repo root: node tools/greet-art/fetch.mjs. The music is made by gen_music.py.
// The camera runtime and models are not here: see mediapipe.mjs.
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const out = "public/lessons/lesson-04/greet-the-world";

// Saved name: pack and file under tools/greet-art/packs/.
const sounds = {
  "count.ogg": "digital-audio/Audio/tone1.ogg",
  "go.ogg": "digital-audio/Audio/highUp.ogg",
  "right.ogg": "interface-sounds/Audio/confirmation_002.ogg",
  "wrong.ogg": "digital-audio/Audio/lowDown.ogg",
  "pass.ogg": "interface-sounds/Audio/confirmation_001.ogg",
  "cheer.ogg": "music-jingles/Audio/Sax jingles/jingles_SAX00.ogg",
};

await mkdir(join(out, "sounds"), { recursive: true });
for (const [file, source] of Object.entries(sounds)) {
  await copyFile(join("tools/greet-art/packs", source), join(out, "sounds", file));
  console.log(join(out, "sounds", file));
}
