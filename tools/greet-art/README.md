# camera models

`mediapipe.mjs` puts the camera reader in `public/lessons/lesson-04/greet-the-world/mediapipe/`: the installed MediaPipe SIMD runtime, copied, and the pose, hand gesture, and face models, downloaded and checked against pinned hashes. None of it is committed (about 29 MB). `npm run dev` and `npm run build` run it first and skip what is already there, so they work offline after the first run. If a model changes upstream the build fails; review it, then update its hash.

`fetch.mjs` copies the sound clips from `tools/greet-art/packs/`, and `gen_music.py` makes the music. Those files are small and committed.

The script routes only the exact native startup message `INFO: Created TensorFlow Lite XNNPACK delegate for CPU.` to `console.info`. Other stderr messages retain `console.error`. It fails if the runtime's stderr entry point changes, so package updates require reviewing this small adapter.

Inference runs in a browser module worker using the package's module WASM assets. The worker imports the module runtime explicitly, then restores its factory for each model because MediaPipe clears it after initialization. Explicit imports also work with Turbopack's classic-worker bootstrap. Camera capture and overlays remain on the main thread, with one transferred frame in flight. Python is not required.
