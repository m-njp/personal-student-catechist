import type { FaceLandmarker, GestureRecognizer, PoseLandmarker } from "@mediapipe/tasks-vision";

import { tracking } from "./config";

type Delegate = "GPU" | "CPU";

/** The three ready-made MediaPipe models. */
export interface Detectors {
  pose: PoseLandmarker;
  gesture: GestureRecognizer;
  face: FaceLandmarker;
  /** GPU unless a model could only start on the CPU. */
  delegate: Delegate;
}

/** Tries the GPU first, and the CPU when the GPU will not start, as on some school laptops. */
async function create<T>(make: (delegate: Delegate) => Promise<T>): Promise<[T, Delegate]> {
  try {
    return [await make("GPU"), "GPU"];
  } catch {
    return [await make("CPU"), "CPU"];
  }
}

/**
 * Loads the models from this site, so class never waits on the school's internet for them.
 * `step` is told which of the three is loading. The caller closes them with `closeDetectors`.
 */
export async function loadDetectors(base: string, step: (index: number) => void, loadRuntime = importRuntime): Promise<Detectors> {
  const vision = await import("@mediapipe/tasks-vision");
  // Turbopack may bootstrap this as a classic worker. Import the ESM runtime explicitly.
  const runtime = await loadRuntime(`${base}/vision_wasm_module_internal.js`);
  const files = { wasmLoaderPath: "", wasmBinaryPath: `${base}/vision_wasm_module_internal.wasm` };
  const make = <T>(factory: (delegate: Delegate) => Promise<T>) => create(delegate => {
    // MediaPipe clears ModuleFactory after every model, including a failed GPU attempt.
    (globalThis as unknown as { ModuleFactory: unknown }).ModuleFactory = runtime.default;
    return factory(delegate);
  });
  const model = (name: string, delegate: Delegate) => ({ modelAssetPath: `${base}/${name}`, delegate });

  // A model that loaded is closed again if a later one fails, so nothing is left holding memory.
  const made: { close(): void }[] = [];
  const keep = <T extends { close(): void }>([loaded, delegate]: [T, Delegate]): [T, Delegate] => {
    made.push(loaded);
    return [loaded, delegate];
  };
  try {
    step(0);
    const [pose, poseOn] = keep(
      await make((delegate) =>
        vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: model("pose_landmarker_lite.task", delegate),
          runningMode: "VIDEO",
          numPoses: tracking.poses,
        }),
      ),
    );
    step(1);
    const [gesture, gestureOn] = keep(
      await make((delegate) =>
        vision.GestureRecognizer.createFromOptions(files, {
          baseOptions: model("gesture_recognizer.task", delegate),
          runningMode: "VIDEO",
          numHands: tracking.hands,
        }),
      ),
    );
    step(2);
    const [face, faceOn] = keep(
      await make((delegate) =>
        vision.FaceLandmarker.createFromOptions(files, {
          baseOptions: model("face_landmarker.task", delegate),
          runningMode: "VIDEO",
          numFaces: tracking.faces,
          outputFaceBlendshapes: true,
        }),
      ),
    );
    return {
      pose,
      gesture,
      face,
      delegate: [poseOn, gestureOn, faceOn].includes("CPU") ? "CPU" : "GPU",
    };
  } catch (error) {
    for (const loaded of made) loaded.close();
    throw error;
  }
}

export function closeDetectors(models: Detectors): void {
  models.pose.close();
  models.gesture.close();
  models.face.close();
}

async function importRuntime(url: string): Promise<{ default: unknown }> {
  return import(/* webpackIgnore: true */ url);
}
