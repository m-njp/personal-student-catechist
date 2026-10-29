import type { FaceLandmarkerResult, GestureRecognizerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision";

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
export type WorkerResponse = { type: "step"; step: number } | { type: "ready"; delegate: "GPU" | "CPU" } | { type: "result"; result: Inference } | { type: "error"; message: string };
