import type { Tunable } from "./detection/config";

/** Every reading the camera makes, in the order the setup check lists them. */
export const READINGS = [
  // Hand signs MediaPipe's gesture model knows out of the box.
  "thumbsUp",
  "thumbsDown",
  "pointingUp",
  "victory",
  "openPalm",
  "twoOpenPalms",
  "fist",
  // Read from the hand's own points: the index finger pointing down, the other fingers curled.
  "pointingDown",
  // Poses read from the body's landmarks.
  "handsOnHead",
  "praying",
  // Feelings read from the face's blendshapes.
  "happy",
  "surprised",
] as const;

export type Reading = (typeof READINGS)[number];
export type HandReading = Extract<Reading, "thumbsUp" | "thumbsDown" | "pointingUp" | "victory" | "openPalm" | "twoOpenPalms" | "fist" | "pointingDown">;
export type BodyReading = Extract<Reading, "handsOnHead" | "praying">;
export type FaceReading = Extract<Reading, "happy" | "surprised">;

export interface TrueFalse {
  kind: "trueFalse";
  id: string;
  text: string;
  answer: boolean;
  /** The signs for true and for false. Thumbs up and down when left out. */
  signs?: readonly [Reading, Reading];
}

export interface Choice {
  kind: "choice";
  id: string;
  text: string;
  choices: readonly [string, string, string];
  answer: 0 | 1 | 2;
  /** The signs for A, B, and C. Point up, peace sign, and open palm when left out. */
  signs?: readonly [Reading, Reading, Reading];
}

/** An action pose: one action to show and hold. */
export interface Pose {
  kind: "pose";
  id: string;
  text: string;
  pose: Reading;
}

export type Challenge = TrueFalse | Choice | Pose;

/** How a reading is named on screen. */
export interface ReadingWords {
  /** Short, for the player's tag, such as "thumbs up". */
  label: string;
  /** Said when a player is trying it. */
  hint: string;
}

/** Every word Greet the World shows, its questions, and how it scores. */
export interface GreetContent {
  title: string;
  introduction: string;
  /** The lesson page's instructions line. */
  howTo: string;
  /** Shown instead of the game on a phone or a narrow window. */
  notice: string;
  flow: readonly [string, string, string];
  guide: {
    title: string;
    steps: readonly { title: string; text: string }[];
    continue: string;
  };
  menu: { back: string };
  ui: { live: string; continue: string; searching: string; hands: string; holding: string; accepted: string; diagnostics: string; manual: string };
  loading: { title: string; steps: readonly [string, string, string]; failed: string };
  /** Player 1 stands on the left of the mirrored camera, Player 2 on the right. */
  players: readonly [string, string];
  camera: Readonly<Record<"blocked" | "busy" | "missing" | "failed", string>> & { retry: string; waiting: string };
  setup: {
    title: string;
    complete: string;
    /** "{player} is ready" and "{player}: step closer". */
    found: string;
    missing: string;
    pick: string;
    /** Seconds held so far: "{n} of {all} s". */
    holding: string;
    passed: string;
    /** "{done} of {all}" signs read so far. */
    count: string;
    lighting: string;
    backlit: string;
    dark: string;
    privacy: string;
    log: string;
    findAgain: string;
    /** The detection log's lines. {player}, {reading}, and {detail} are filled in. */
    events: Readonly<Record<"camera" | "models" | "locked" | "lost" | "on" | "off" | "held", string>>;
  };
  quiz: {
    match: string;
    /** The two sides of a match, as the players stand. */
    sides: readonly [string, string];
    /** The button that starts a match: "Start {blue} vs {orange}". */
    versus: string;
    played: string;
    ready: string;
    /** "Question {n} of {all}". */
    round: string;
    /** What each kind of card is called, over its question. */
    kinds: Readonly<Record<Challenge["kind"], string>>;
    getReady: string;
    pause: string;
    resume: string;
    paused: string;
    skip: string;
    answered: string;
    waiting: string;
    right: string;
    oops: string;
    timeUp: string;
    answerIs: string;
    points: string;
    /** One part of a card's hint: "{sign} for {answer}." */
    signFor: string;
    /** The teacher's button for a pose: "{group} did it". */
    markDone: string;
    keys: string;
    matchEnd: string;
    scoreboardBack: string;
    final: string;
    finalTask: string;
    finalScores: string;
    question: string;
    player: string;
    rawLegend: string;
    rawColumns: string;
    closeDetails: string;
  };
  /** The hint under a pose card. A question's hint is made from its signs. */
  poseHint: string;
  answers: { true: string; false: string; letters: readonly [string, string, string] };
  lines: { final: string; question: string };
  /** "Group {n}". */
  group: string;
  groups: { min: number; max: number };
  readings: Readonly<Record<Reading, ReadingWords>>;
  /** Seconds to answer each kind of card. */
  seconds: Readonly<Record<Challenge["kind"], number>>;
  /** Seconds a card shows before its timer starts, with a 3, 2, 1, and how long each result stays up. */
  pace: { preview: number; result: number };
  points: {
    right: number;
    /** Up to this much more for answering fast, in step with the time left. */
    speed: number;
  };
  /** Every match plays these, in this order. */
  questions: readonly Challenge[];
  teacher: {
    open: string;
    title: string;
    sound: string;
    noCamera: string;
    on: string;
    off: string;
    groups: string;
    fewer: string;
    more: string;
    scores: string;
    detection: string;
    hold: string;
    seconds: string;
    thresholds: Readonly<Record<Tunable, string>>;
    reset: string;
    confirmReset: string;
    fullScreen: string;
    leaveFullScreen: string;
  };
}

/**
 * The signs that answer a card, in the order of its answers: true then false, or A, B, C. A pose has one.
 * Thumbs and fingers unless the question names its own.
 */
export function signsOf(card: Challenge): readonly Reading[] {
  switch (card.kind) {
    case "trueFalse":
      return card.signs ?? ["thumbsUp", "thumbsDown"];
    case "choice":
      return card.signs ?? ["pointingUp", "victory", "openPalm"];
    case "pose":
      return [card.pose];
  }
}

/** Puts values into a line, such as "Group {n}". */
export function fill(line: string, values: Readonly<Record<string, string | number>>): string {
  return line.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
