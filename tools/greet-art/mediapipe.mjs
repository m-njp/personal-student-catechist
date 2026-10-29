// Puts the camera reader where the game loads it: the MediaPipe runtime copied from node_modules, and the three
// models downloaded. None of it is committed (about 29 MB), so `npm run dev` and `npm run build` run this first.
// It skips what is already in place, so later runs work offline. Run by hand: node tools/greet-art/mediapipe.mjs
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const out = "public/lessons/lesson-04/greet-the-world/mediapipe";

// Only the SIMD module build, the one detectors.ts loads: every Chrome and Edge on a classroom laptop has SIMD.
const runtime = { js: "vision_wasm_module_internal.js", wasm: "vision_wasm_module_internal.wasm" };

// Pinned by hash, so a model that changes upstream fails the build instead of changing the game.
const models = {
  "gesture_recognizer.task": {
    url: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
    sha256: "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
  },
  "pose_landmarker_lite.task": {
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
  },
  "face_landmarker.task": {
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  },
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (file) => readFile(file).catch(() => null);

await mkdir(out, { recursive: true });

// The loader is patched on the way in: its native startup notice uses stderr, which Next.js treats as an application error.
const source = join("node_modules/@mediapipe/tasks-vision/wasm", runtime.js);
const loader = await readFile(source, "utf8");
const sink = "var err = console.error.bind(console);";
const override = 'if (Module["printErr"]) err = Module["printErr"];';
if (loader.split(sink).length !== 2 || loader.split(override).length !== 2) throw new Error("MediaPipe stderr changed; review its logging adapter.");
const patched = loader.replace(sink, `var reportError = console.error.bind(console);
var err = (...args) => {
  if (args.length === 1 && typeof args[0] === "string" && args[0].replace(/[\\r\\n]+$/, "") === "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") {
    console.info(args[0]);
  } else {
    reportError(...args);
  }
};`).replace(override, 'if (Module["printErr"]) reportError = Module["printErr"];');
if ((await read(join(out, runtime.js)))?.toString("utf8") !== patched) {
  await writeFile(join(out, runtime.js), patched);
  console.log(`mediapipe: wrote ${runtime.js}`);
}

const wasmFrom = join("node_modules/@mediapipe/tasks-vision/wasm", runtime.wasm);
const wasmTo = join(out, runtime.wasm);
if ((await stat(wasmTo).catch(() => null))?.size !== (await stat(wasmFrom)).size) {
  await copyFile(wasmFrom, wasmTo);
  console.log(`mediapipe: wrote ${runtime.wasm}`);
}

for (const [file, { url, sha256: wanted }] of Object.entries(models)) {
  const have = await read(join(out, file));
  if (have && sha256(have) === wanted) continue;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== wanted) throw new Error(`${file} changed upstream; review it, then update its hash in tools/greet-art/mediapipe.mjs.`);
  await writeFile(join(out, file), bytes);
  console.log(`mediapipe: downloaded ${file}`);
}
