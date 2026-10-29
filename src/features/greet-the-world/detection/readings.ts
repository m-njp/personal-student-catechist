import type { BodyReading, FaceReading, HandReading } from "../content";
import type { Thresholds } from "./config";
import { closeness, distance, POSE, type Landmarks, type Point } from "./geometry";

/**
 * Every reading is a level: 0 is nowhere near, 1 is exactly at the threshold. Levels go a little past 1,
 * so a clear pose stays on through a frame that dips.
 */
const MOST = 1.5;
const level = (value: number, threshold: number) => (threshold > 0 ? Math.min(MOST, Math.max(0, value / threshold)) : 0);

export type Levels = Partial<Record<HandReading | BodyReading | FaceReading, number>>;

const GESTURES: Readonly<Record<string, HandReading>> = {
  Thumb_Up: "thumbsUp",
  Thumb_Down: "thumbsDown",
  Pointing_Up: "pointingUp",
  Victory: "victory",
  Open_Palm: "openPalm",
  Closed_Fist: "fist",
};

/** The gesture model's best guess for one hand. */
export interface Gesture {
  name: string;
  score: number;
}

/** A hand's own points, by MediaPipe's numbers. */
const HAND = { wrist: 0, indexKnuckle: 5, indexTip: 8, middleKnuckle: 9 } as const;
/** The middle, ring, and little fingers: each tip, and the joint it folds past when curled. */
const OTHER_FINGERS = [
  [12, 10],
  [16, 14],
  [20, 18],
] as const;

/**
 * Point down, which the gesture model does not know: the index fingertip well below its knuckle, and the
 * other fingers curled so their tips sit closer to the wrist than their middle joints.
 */
export function pointingDownLevel(hand: Landmarks, t: Thresholds): number {
  const size = distance(hand[HAND.wrist], hand[HAND.middleKnuckle]);
  if (!size) return 0;
  const curled = OTHER_FINGERS.every(([tip, joint]) => distance(hand[tip], hand[HAND.wrist]) < 1.1 * distance(hand[joint], hand[HAND.wrist]));
  return curled ? level((hand[HAND.indexTip].y - hand[HAND.indexKnuckle].y) / size, t.pointDown) : 0;
}

/**
 * A player's hands: the gesture model's guess for each, and point down from its points. The stronger hand
 * wins each sign. Gestures the game does not use are ignored.
 */
export function handLevels(gestures: readonly Gesture[], hands: readonly Landmarks[], t: Thresholds): Levels {
  const levels: Levels = {};
  for (const gesture of gestures) {
    const reading = GESTURES[gesture.name];
    if (reading) levels[reading] = Math.max(levels[reading] ?? 0, level(gesture.score, t.minScore));
  }
  for (const hand of hands) levels.pointingDown = Math.max(levels.pointingDown ?? 0, pointingDownLevel(hand, t));
  return levels;
}

/** Only uniquely assigned hands enter this aggregate. */
export interface AssignedHand {
  points: Landmarks;
  gesture: Gesture | null;
  wrist: number;
}

export function playerHandLevels(hands: readonly AssignedHand[], t: Thresholds): Levels {
  const levels = handLevels(hands.flatMap(hand => hand.gesture ? [hand.gesture] : []), hands.map(hand => hand.points), t);
  const palms = hands.filter(hand => hand.gesture?.name === "Open_Palm");
  levels.twoOpenPalms = palms.length === 2 && palms[0].wrist !== palms[1].wrist
    ? Math.min(...palms.map(hand => level(hand.gesture?.score ?? 0, t.minScore))) : 0;
  return levels;
}

/** The parts of a body the poses need, or null when the model cannot see them well. */
function frame(pose: Landmarks, t: Thresholds) {
  const [nose, leftShoulder, rightShoulder, leftWrist, rightWrist] = [
    pose[POSE.nose],
    pose[POSE.leftShoulder],
    pose[POSE.rightShoulder],
    pose[POSE.leftWrist],
    pose[POSE.rightWrist],
  ];
  if (![nose, leftShoulder, rightShoulder, leftWrist, rightWrist].every((point) => point && point.visibility >= t.visibility)) {
    return null;
  }
  const width = distance(leftShoulder, rightShoulder);
  if (width <= 0) return null;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hips = [pose[POSE.leftHip], pose[POSE.rightHip]].filter((point) => point && point.visibility >= t.visibility);
  return {
    nose,
    width,
    shoulderY,
    shoulders: [leftShoulder, rightShoulder],
    wrists: [leftWrist, rightWrist],
    headTop: nose.y - t.headTop * width,
    // Without the hips in view, the chest ends about a torso below the shoulders.
    hipY: hips.length > 0 ? hips.reduce((sum, hip) => sum + hip.y, 0) / hips.length : shoulderY + 1.5 * width,
  };
}

type Pose = BodyReading;

/** The poses read from visible body joints. */
export function bodyLevels(pose: Landmarks, t: Thresholds): Record<Pose, number> {
  const body = frame(pose, t);
  if (!body) return { handsOnHead: 0, praying: 0 };
  const { nose, width, shoulderY, shoulders, wrists, headTop, hipY } = body;
  const [left, right] = wrists;

  // Hands on head: both wrists near the top of the head.
  const head: Point = { x: nose.x, y: headTop, visibility: 1 };
  const near = t.handsOnHeadNear;
  const handsOnHead = Math.min(...wrists.map((wrist) => closeness(distance(wrist, head) / width, near, 3 * near)));

  // Praying: wrists together, in front of the chest.
  const together = closeness(distance(left, right) / width, t.prayingNear, 3 * t.prayingNear);
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;
  const [minX, maxX] = [Math.min(shoulders[0].x, shoulders[1].x), Math.max(shoulders[0].x, shoulders[1].x)];
  const atChest = midY >= shoulderY - 0.3 * width && midY <= hipY && midX >= minX - 0.25 * width && midX <= maxX + 0.25 * width;
  const praying = atChest ? together : 0;

  return { handsOnHead, praying };
}

/** A face's blendshape scores, by MediaPipe's names. */
export type Blendshapes = Readonly<Record<string, number>>;

/** The blendshapes the feelings use, and the threshold each is measured against. */
const FACE_PARTS = {
  mouthSmileLeft: "smile",
  mouthSmileRight: "smile",
  jawOpen: "jawOpen",
  eyeWideLeft: "eyeWide",
  eyeWideRight: "eyeWide",
  browInnerUp: "browInnerUp",
} as const satisfies Record<string, keyof Thresholds>;

/**
 * A player's resting face, from the frames right after they are found. Each part is capped at half its
 * threshold, so a player who was already smiling then can still smile enough later.
 */
export function restingFace(frames: readonly Blendshapes[], t: Thresholds): Blendshapes {
  const resting: Record<string, number> = {};
  if (frames.length === 0) return resting;
  for (const [part, threshold] of Object.entries(FACE_PARTS)) {
    const average = frames.reduce((sum, shapes) => sum + (shapes[part] ?? 0), 0) / frames.length;
    resting[part] = Math.min(average, 0.5 * t[threshold]);
  }
  return resting;
}

/** The feelings on a face, measured from the player's resting face. */
export function faceLevels(shapes: Blendshapes, resting: Blendshapes, t: Thresholds): Record<FaceReading, number> {
  const part = (name: keyof typeof FACE_PARTS) => Math.max(0, (shapes[name] ?? 0) - (resting[name] ?? 0));
  const both = (a: keyof typeof FACE_PARTS, b: keyof typeof FACE_PARTS) => (part(a) + part(b)) / 2;

  const happy = level(Math.min(part("mouthSmileLeft"), part("mouthSmileRight")), t.smile);
  const wideEyes = Math.max(level(both("eyeWideLeft", "eyeWideRight"), t.eyeWide), level(part("browInnerUp"), t.browInnerUp));
  const surprised = Math.min(level(part("jawOpen"), t.jawOpen), wideEyes);

  return { happy, surprised };
}
