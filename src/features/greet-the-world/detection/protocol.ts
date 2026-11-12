import type { FaceLandmarkerResult, GestureRecognizerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision";

/** Selected processing modes across the loaded camera models. */
export type ProcessingMode = "GPU" | "CPU" | "Mixed";

export interface FrameRequest {
  type: "frame";
  image: ImageBitmap;
  timestamp: number;
  run: number;
  generation: number;
  hands: boolean;
  face: boolean;
}
export interface Inference {
  timestamp: number;
  run: number;
  generation: number;
  pose: Pick<PoseLandmarkerResult, "landmarks">;
  hands: Pick<GestureRecognizerResult, "landmarks" | "gestures">;
  face: Pick<FaceLandmarkerResult, "faceLandmarks" | "faceBlendshapes">;
  inferenceMs: number;
}
export type WorkerRequest = { type: "init"; base: string } | FrameRequest | { type: "close" };
export type WorkerResponse = { type: "step"; step: number } | { type: "ready"; delegate: ProcessingMode } | { type: "result"; result: Inference } | { type: "error"; message: string };
