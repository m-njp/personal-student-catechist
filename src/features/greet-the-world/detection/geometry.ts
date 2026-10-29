/**
 * A landmark on the stage: the camera image mirrored, so it reads like a mirror, with x stretched by the
 * image's aspect ratio so a distance means the same across and down. y runs from 0 at the top to 1.
 */
export interface Point {
  x: number;
  y: number;
  visibility: number;
}

export type Landmarks = readonly Point[];

/** MediaPipe's pose landmark numbers that the readings use. */
export const POSE = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
} as const;

/** The wrist on a hand's landmarks, and the nose tip on a face's. */
export const HAND_WRIST = 0;
/** The middle finger's knuckle: wrist to here measures how big a hand looks. */
export const HAND_KNUCKLE = 9;
export const FACE_NOSE = 1;

interface RawLandmark {
  x: number;
  y: number;
  visibility?: number;
}

/** MediaPipe's 0 to 1 landmarks, on the stage. Hands and faces carry no visibility, so they count as seen. */
export function toStage(raw: readonly RawLandmark[], aspect: number, hasVisibility: boolean): Point[] {
  return raw.map((point) => ({ x: (1 - point.x) * aspect, y: point.y, visibility: hasVisibility ? (point.visibility ?? 0) : 1 }));
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const middle = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  visibility: Math.min(a.visibility, b.visibility),
});

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 1 at `near` or closer, falling to 0 at `far`. */
export const closeness = (value: number, near: number, far: number) => clamp01((far - value) / (far - near));
