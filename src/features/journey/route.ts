import type { Timing } from "./Journey";

/** The four memories, then the Church. */
export const MEMORY_COUNT = 4;

/** Where the pupil stops for memory `i` (0 to 3), or at the Church door (MEMORY_COUNT). */
export function stopX(i: number, timing: Timing): number {
  let x = 0;
  for (let k = 0; k <= Math.min(i, MEMORY_COUNT); k += 1) x += timing.stopGaps[k] ?? 0;
  return x;
}

export type SoundName =
  | "music"
  | "ending"
  | "memory"
  | "whoosh"
  | "ask"
  | "reveal"
  | "fanfare"
  | "cheer"
  | "pop"
  | "brick"
  | "hammer"
  | "rise"
  | "bell"
  | "sparkle"
  | "step-0"
  | "step-1"
  | "horn"
  | "engine"
  | "bark"
  | "cluck"
  | "handbell"
  | "bounce"
  | "chirp"
  | "firework";

/** A sound at a point in a memory's replay, from 0 (start) to 1 (end). */
export interface Cue {
  at: number;
  sound: SoundName;
}

/**
 * The choreography of each replay, as fractions of the replay's length, so the renderer draws it
 * and the rules play its sounds from the same numbers.
 */
export const WALL = {
  classmates: 0.03,
  layStart: 0.08,
  layEnd: 0.64,
  /** How long one brick takes to fall into place. */
  fall: 0.045,
  colorStart: 0.68,
  colorEnd: 0.84,
};

export function brickLanding(i: number, count: number): number {
  return WALL.layStart + ((WALL.layEnd - WALL.layStart) * i) / Math.max(1, count - 1) + WALL.fall;
}

export const BAYAN = {
  firstRise: 0.04,
  /** Each building starts rising this much after the one before. */
  step: 0.21,
  rise: 0.15,
};

export const KUBO = {
  appear: 0.1,
  liftEnd: 0.22,
  carryEnd: 0.76,
  lowerEnd: 0.86,
  /** How far the crew carries the house along the road. */
  distance: 72,
};

export const GLOBE = {
  firstGreeting: 0.08,
  step: 0.15,
  light: 0.72,
};

/** Small moments on the road between memories. The walk pauses while each one plays. */
export type QuestId = "lola" | "ball" | "jeepney" | "dog" | "garland";

export interface Quest {
  id: QuestId;
  /** Which stretch of road: 0 is before the first memory, 4 is before the Church. */
  segment: number;
  /** How far along that stretch, from the stop before it. */
  offset: number;
  holdMs: number;
}

export const QUESTS: readonly Quest[] = [
  { id: "lola", segment: 0, offset: 190, holdMs: 2600 },
  { id: "ball", segment: 1, offset: 330, holdMs: 2600 },
  { id: "dog", segment: 3, offset: 330, holdMs: 2600 },
  { id: "garland", segment: 4, offset: 290, holdMs: 2600 },
  // The jeepney pulls up at the Church plaza, and stays parked there for the fiesta.
  { id: "jeepney", segment: 4, offset: 420, holdMs: 2800 },
];

export function questX(quest: Quest, timing: Timing): number {
  return (quest.segment === 0 ? 0 : stopX(quest.segment - 1, timing)) + quest.offset;
}

/** The jeepney's stop at the plaza, from the Church door, and how long it takes to pull in. */
export const JEEPNEY = { parkedLeft: -340, arriveMs: 1500 };

/** The fiesta at the Church, in milliseconds after arriving. */
export const FIESTA = {
  bells: [0, 900, 1800],
  doves: 2600,
  cheer: 3400,
  bunting: 1500,
  fireworksFrom: 4200,
  fireworksTo: 17000,
  fireworkEvery: 1300,
};

export function cuesFor(memory: number): readonly Cue[] {
  switch (memory) {
    case 0: {
      const cues: Cue[] = [{ at: WALL.classmates, sound: "pop" }];
      // A soft knock every few bricks, not one per brick.
      for (let at = WALL.layStart + WALL.fall; at < WALL.layEnd + WALL.fall; at += 0.055) cues.push({ at, sound: "brick" });
      cues.push({ at: WALL.colorStart, sound: "sparkle" }, { at: WALL.colorEnd, sound: "cheer" });
      return cues;
    }
    case 1:
      return [0, 1, 2, 3].flatMap((k) => {
        const start = BAYAN.firstRise + k * BAYAN.step;
        return [
          { at: start, sound: "rise" as const },
          { at: start + 0.05, sound: "hammer" as const },
          { at: start + BAYAN.rise, sound: "pop" as const },
        ];
      });
    case 2:
      return [
        { at: 0.02, sound: "pop" },
        { at: KUBO.appear, sound: "rise" },
        { at: KUBO.lowerEnd, sound: "brick" },
        { at: KUBO.lowerEnd + 0.02, sound: "cheer" },
      ];
    case 3:
      return [
        ...[0, 1, 2, 3].map((k) => ({ at: GLOBE.firstGreeting + k * GLOBE.step, sound: "pop" as const })),
        { at: GLOBE.light, sound: "sparkle" },
        { at: GLOBE.light + 0.06, sound: "cheer" },
      ];
    default:
      return [];
  }
}

/** The fiesta's sounds, by milliseconds after arriving at the Church. */
export function fiestaCues(): readonly { ms: number; sound: SoundName }[] {
  const cues: { ms: number; sound: SoundName }[] = FIESTA.bells.map((ms) => ({ ms, sound: "bell" }));
  cues.push({ ms: FIESTA.doves, sound: "sparkle" }, { ms: FIESTA.cheer, sound: "fanfare" }, { ms: FIESTA.cheer + 150, sound: "cheer" });
  for (let ms = FIESTA.fireworksFrom; ms < FIESTA.fireworksTo; ms += FIESTA.fireworkEvery) cues.push({ ms, sound: "firework" });
  return cues;
}
