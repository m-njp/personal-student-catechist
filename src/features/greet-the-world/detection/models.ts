import type { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { InferenceClient } from "./InferenceClient";

export interface Models {
  client: InferenceClient;
  delegate: "GPU" | "CPU";
  DrawingUtils: typeof DrawingUtils;
  lines: { body: typeof PoseLandmarker.POSE_CONNECTIONS; hand: typeof PoseLandmarker.POSE_CONNECTIONS; face: typeof PoseLandmarker.POSE_CONNECTIONS; lips: typeof PoseLandmarker.POSE_CONNECTIONS };
}
export async function loadModels(base: string, step: (index: number) => void, signal?: AbortSignal): Promise<Models> {
  const client = new InferenceClient(() => new Worker(new URL("./inference.worker.ts", import.meta.url), { type: "module" }));
  const abort = () => client.close();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    if (signal?.aborted) throw new Error("Loading cancelled");
    const [delegate, vision] = await Promise.all([client.initialize(new URL(base, window.location.href).href, step), import("@mediapipe/tasks-vision")]);
    if (signal?.aborted) throw new Error("Loading cancelled");
    return { client, delegate, DrawingUtils: vision.DrawingUtils, lines: {
      body: vision.PoseLandmarker.POSE_CONNECTIONS, hand: vision.GestureRecognizer.HAND_CONNECTIONS,
      face: vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, lips: vision.FaceLandmarker.FACE_LANDMARKS_LIPS,
    } };
  } catch (error) { client.close(); throw error; }
  finally { signal?.removeEventListener("abort", abort); }
}
export function closeModels(models: Models): void { models.client.close(); }
