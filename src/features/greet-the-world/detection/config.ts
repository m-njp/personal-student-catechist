/**
 * Every detection threshold in one place. Distances are in shoulder widths, so they hold near or far
 * from the camera. Scores are MediaPipe's, from 0 to 1. Tuned in the classroom with the setup check's log.
 */
export const defaultThresholds = {
  /** Lowest gesture score that counts. */
  minScore: 0.6,
  /** Landmarks the model is less sure of than this are ignored. */
  visibility: 0.6,
  /**
   * A player's shoulders must be at least this wide, as a share of the picture's height. Pupils sitting
   * at the back of the room are smaller than this, so they are never read.
   */
  playerSize: 0.14,
  /** Time-based confirmation and visual easing, independent of inference rate. */
  settleMs: 60,
  smoothMs: 70,
  /** A reading turns off only this far below its threshold, so it does not flicker at the edge. */
  hysteresis: 0.1,
  /** Top of the head, this far above the nose. */
  headTop: 0.5,
  /** Hands on head: each wrist this close to the top of the head. */
  handsOnHeadNear: 0.6,
  /** Point down: the index fingertip this far below its knuckle, in hand sizes (wrist to middle knuckle). */
  pointDown: 0.6,
  /** Praying: wrists this close together. */
  prayingNear: 0.4,
  smile: 0.5,
  /** Surprised: the jaw this open, with eyes this wide or inner brows this high. */
  jawOpen: 0.4,
  eyeWide: 0.3,
  browInnerUp: 0.4,
};

export type Thresholds = typeof defaultThresholds;

/** The thresholds the teacher can change from the panel, with their ranges. */
export const tunables = {
  minScore: { min: 0.3, max: 0.9, step: 0.05 },
  smile: { min: 0.2, max: 0.9, step: 0.05 },
  playerSize: { min: 0.06, max: 0.3, step: 0.01 },
} satisfies Partial<Record<keyof Thresholds, { min: number; max: number; step: number }>>;

export type Tunable = keyof typeof tunables;

/** How long a player holds an answer before it counts, in milliseconds. */
export const hold = { initial: 800, min: 400, max: 2000, step: 100 };

/** How the camera follows the players. Not shown to the teacher. */
export const tracking = {
  /** About 25 readings a second, so a sign shows on screen as soon as it is made. */
  everyMs: 40,
  staleMs: 250,
  logEveryMs: 250,
  workerTimeoutMs: 10000,
  handAmbiguity: 0.2,
  /**
   * Bodies, hands, and faces each model looks for. A full classroom has many, so there is room to find
   * the players among the pupils behind them; everyone else is filtered out below.
   */
  poses: 6,
  hands: 6,
  faces: 4,
  /** A locked player is followed only by a body at least this wide, so someone behind never takes their place... */
  followWidth: 0.6,
  /** ...and no farther than this many shoulder widths from where they were. */
  followMove: 1.5,
  /** A hand or face belongs to a player only this close to their wrist or nose, in shoulder widths. */
  matchNear: 1.2,
  /**
   * A hand counts only when it is this big beside its player's shoulders (wrist to middle knuckle), so a
   * small hand of a pupil sitting behind a player's arm is never read as theirs.
   */
  handSize: 0.25,
  /** A player is found again after being out of sight this long. */
  lostMs: 1500,
  /** Face frames taken as a player's resting face, right after they are found. */
  baselineFrames: 15,
  /** How often the lighting is checked, and how bright counts as dark, or as a window behind the players (0 to 1). */
  lightEveryMs: 1000,
  dark: 0.2,
  backlight: 0.25,
};
