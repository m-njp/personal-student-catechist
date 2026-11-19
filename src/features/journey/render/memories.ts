import { BAYAN, brickLanding, GLOBE, KUBO, WALL } from "../route";
import { between, ease, hop, type Painter, type Pose } from "./Painter";

/** ahead: not reached yet, shown faded. replay: playing back, p from 0 to 1. done: as it was left. */
export type Stage = { kind: "ahead" } | { kind: "replay"; p: number } | { kind: "done" };

/** How much road each memory covers to the right of its stop. */
export const MEMORY_SPAN = [240, 600, 250, 240];

/** 1 just after the answer shows, falling to 0: everyone in the memory cheers. */
export type Celebrate = number;

const BAYAN_LOTS: readonly { art: string; at: number; leaders: readonly [string, number][] }[] = [
  { art: "house", at: 34, leaders: [["bea", 60], ["tatay", 94], ["nanay", 114]] },
  { art: "school", at: 160, leaders: [["principal", 236]] },
  { art: "hall", at: 320, leaders: [["president", 391]] },
  { art: "chapel", at: 504, leaders: [["father", 551]] },
];
const FLAG_AT = 464;

const CLASSMATES: readonly [string, number][] = [["mia", 66], ["jun", 120], ["joy", 160]];
const CREW_BACK = ["ella", "dino", "carla"] as const;
const CREW_FRONT = ["marco", "ben", "ana"] as const;
/** Where the crew stands in one row after setting the house down, from the house's left. */
const CREW_ROW = ["marco", "ben", "ana", "carla", "dino", "ella"] as const;
const CREW_ROW_X = [-12, 8, 28, 48, 68, 88];
const WORLD_KIDS = ["amira", "kofi", "lena", "hiro"] as const;
const WORLD_KID_X = [44, 66, 172, 194];

/** Where the camera looks during a replay, so a wide memory is followed as it builds. */
export function replayFocus(memory: number, stop: number, p: number): number {
  if (memory !== 1) return stop + MEMORY_SPAN[memory] / 2 - 10;
  const k = Math.min(3, Math.max(0, Math.floor((p - BAYAN.firstRise) / BAYAN.step)));
  const lot = BAYAN_LOTS[k];
  return stop + lot.at + 60;
}

function pose(celebrate: Celebrate, otherwise: Pose = "idle"): Pose {
  return celebrate > 0 ? "cheer" : otherwise;
}

/** Lesson 1: classmates carry bricks, the bricks fall into place as halftone dots, then the dove fills with color. */
export function drawWall(p: Painter, stop: number, stage: Stage, celebrate: Celebrate) {
  const left = stop + 46;
  const bottom = p.feet - 10;
  const [, wallH] = p.size("wall-color");
  const top = bottom - wallH;
  const faded = stage.kind === "ahead";
  p.standing("wall-footing", left - 6, p.feet - 2, { faded });
  p.standing("ladder", left + 134, p.feet - 4, { faded });
  p.standing("bucket", left + 154, p.feet, { faded });
  if (stage.kind === "ahead") {
    p.standing("wall-dots", left, bottom, { faded: true, alpha: 0.35 });
    return;
  }
  if (stage.kind === "done") {
    p.standing("wall-color", left, bottom);
  } else {
    const t = stage.p;
    const bricks = p.atlas.meta.bricks;
    p.standing("wall-dots", left, bottom, { faded: true, alpha: 0.2 });
    bricks.forEach((brick, i) => {
      const land = brickLanding(i, bricks.length);
      const f = between(t, land - WALL.fall, land);
      if (f <= 0) return;
      const drop = (1 - ease(f)) * 34;
      p.sprite("wall-dots", left - p.cam, top - drop, { crop: brick, alpha: Math.min(1, f * 3) });
      if (f < 1 && f > 0.8) p.dust(left + brick[0] + brick[2] / 2, top + brick[1] + brick[3] + 2, (f - 0.8) * 5);
    });
    const color = between(t, WALL.colorStart, WALL.colorEnd);
    if (color > 0) p.standing("wall-color", left, bottom, { alpha: color });
    const shine = between(t, WALL.colorStart, WALL.colorStart + 0.12);
    for (let k = 0; k < 6; k += 1) p.sparkle(left + 18 + k * 20, top + 16 + (k % 2) * 34, shine - k * 0.05);
  }
  CLASSMATES.forEach(([id, offset], k) => {
    const t = stage.kind === "replay" ? stage.p : 1;
    const shown = between(t, WALL.classmates, WALL.classmates + 0.05);
    if (shown <= 0) return;
    const cheering = (stage.kind === "replay" && t > WALL.colorEnd) || celebrate > 0;
    const lift = cheering ? hop(((p.clock + k * 170) % 700) / 700, 4) : 0;
    p.person(p.front(id, cheering ? "cheer" : "idle", k * 400), stop + offset, p.feet + 2, { alpha: shown, lift });
  });
}

/** Lesson 2: the house, the school, the town hall, and the chapel rise, and each leader appears. */
export function drawBayan(p: Painter, stop: number, stage: Stage, celebrate: Celebrate) {
  const ground = p.feet - 6;
  const flagFrame = `flag-${Math.floor(p.clock / 260) % 3}`;
  BAYAN_LOTS.forEach((lot, k) => {
    const left = stop + lot.at;
    const [w, h] = p.size(lot.art);
    const start = BAYAN.firstRise + k * BAYAN.step;
    const rise = stage.kind === "replay" ? ease(between(stage.p, start, start + BAYAN.rise)) : 1;
    const faded = stage.kind === "ahead";
    if (stage.kind === "replay" && rise <= 0) {
      p.standing(lot.art, left, ground, { faded: true, alpha: 0.25 });
    } else if (stage.kind === "replay" && rise < 1) {
      // Rises out of the ground: only the part above the ground line shows, with dust at its base.
      const visible = Math.max(1, Math.round(h * rise));
      const shake = Math.round(Math.sin(p.clock / 30)) * 0.5;
      p.sprite(lot.art, left - p.cam + shake, ground - visible, { crop: [0, 0, w, visible] });
      for (let d = 0; d < 5; d += 1) p.dust(left + w * (0.1 + d * 0.2), ground + 4, (stage.p * 40 + d * 0.21) % 1);
    } else {
      p.standing(lot.art, left, ground, { faded, alpha: faded ? 0.5 : 1 });
    }
    if (lot.art === "hall") {
      const up = stage.kind === "replay" ? rise : 1;
      if (up > 0) p.standing(flagFrame, stop + FLAG_AT, ground, { faded, alpha: faded ? 0.5 : up });
    }
    if (stage.kind === "ahead") return;
    const popAt = start + BAYAN.rise;
    lot.leaders.forEach(([id, offset], j) => {
      const shown = stage.kind === "replay" ? between(stage.p, popAt, popAt + 0.05) : 1;
      if (shown <= 0) return;
      const fresh = stage.kind === "replay" && stage.p < popAt + 0.18;
      const lift = fresh ? hop(between(stage.p, popAt, popAt + 0.08), 6) : celebrate > 0 ? hop(((p.clock + j * 230) % 650) / 650, 4) : 0;
      p.person(p.front(id, pose(celebrate, fresh ? "wave" : "idle"), j * 300), stop + offset, p.feet, { alpha: shown, lift });
      if (stage.kind === "replay") p.sparkle(stop + offset, p.feet - 50, between(stage.p, popAt, popAt + 0.08));
    });
  });
  // Hens peck around the yard.
  for (const [x, kind] of [[140, "hen"], [150, "rooster"]] as const) {
    p.standing(`${kind}-${Math.floor((p.clock + x * 13) / 380) % 2}`, stop + x, p.feet - 4, { faded: stage.kind === "ahead", alpha: stage.kind === "ahead" ? 0.5 : 1 });
  }
}

/** Lesson 3: the crew lifts the bahay kubo together and carries it down the road. */
export function drawKubo(p: Painter, stop: number, stage: Stage, celebrate: Celebrate) {
  const start = stop + 40;
  const groundBottom = p.feet - 8;
  const liftedBottom = p.feet + 2 - p.atlas.meta.poleRise;
  if (stage.kind === "ahead") {
    p.standing("kubo", start, groundBottom, { faded: true, alpha: 0.55 });
    return;
  }
  let hutLeft = start + KUBO.distance;
  let hutBottom = groundBottom;
  let carrying = false;
  let crewAlpha = 1;
  let walked = 0;
  let spread = 1;
  if (stage.kind === "replay") {
    const t = stage.p;
    crewAlpha = between(t, 0, KUBO.appear);
    const lift = ease(between(t, KUBO.appear, KUBO.liftEnd));
    const carry = between(t, KUBO.liftEnd, KUBO.carryEnd);
    const lower = ease(between(t, KUBO.carryEnd, KUBO.lowerEnd));
    walked = KUBO.distance * carry;
    hutLeft = start + walked;
    hutBottom = groundBottom + (liftedBottom - groundBottom) * (lift - lower);
    carrying = t < KUBO.carryEnd;
    spread = lower;
    if (carrying && carry > 0 && carry < 1) hutBottom += Math.round(Math.sin(walked / 2.4)) * 0.5;
    for (let d = 0; d < 4; d += 1) p.dust(hutLeft + 8 + d * 30, p.feet + 2, between(t, KUBO.lowerEnd - 0.02, KUBO.lowerEnd + 0.06) - d * 0.08);
    p.sparkle(hutLeft + 53, hutBottom - 96, between(t, KUBO.lowerEnd, KUBO.lowerEnd + 0.1));
  }
  p.standing("kubo", hutLeft, hutBottom);
  if (carrying) p.sprite("pole", hutLeft - 15 - p.cam, hutBottom - 3);
  const place = (row: readonly string[], offsets: readonly number[], feet: number) => {
    row.forEach((id, k) => {
      if (carrying) {
        const frame = walked > 0 ? `${id}-carry-${Math.floor((walked + k * 9) / 5) % 8}` : `${id}-lift`;
        p.person(frame, hutLeft + offsets[k], feet, { side: true, alpha: crewAlpha });
        return;
      }
      const slot = CREW_ROW.indexOf(id as (typeof CREW_ROW)[number]);
      const x = hutLeft + offsets[k] + (CREW_ROW_X[slot] - offsets[k]) * spread;
      const cheering = stage.kind === "replay" || celebrate > 0;
      const lift = cheering ? hop(((p.clock + slot * 140) % 720) / 720, 4) : 0;
      p.person(p.front(id, cheering ? "cheer" : "idle", k * 300), x, feet + (feet < p.feet ? 3 * spread : 0), { lift });
    });
  };
  place(CREW_BACK, [22, 52, 82], p.feet - 3);
  place(CREW_FRONT, [10, 40, 70], p.feet);
}

/** Lesson 4: friends from around the world say hello, and the globe lights up. */
export function drawGlobe(p: Painter, stop: number, stage: Stage, celebrate: Celebrate, greetings: readonly string[], talking: boolean) {
  const standLeft = stop + 100;
  const standBottom = p.feet - 4;
  const [, standH] = p.size("globe-stand");
  const standTop = standBottom - standH;
  const faded = stage.kind === "ahead";
  const lit = stage.kind === "done" || (stage.kind === "replay" && stage.p >= GLOBE.light);
  if (lit) {
    const [gw, gh] = p.size("glow-small");
    const pulse = 0.55 + Math.sin(p.clock / 400) * 0.2;
    const grow = stage.kind === "replay" ? ease(between(stage.p, GLOBE.light, GLOBE.light + 0.1)) : 1;
    p.sprite("glow-small", standLeft + 28 - gw / 2 - p.cam, standTop + 24 - gh / 2, { alpha: pulse * grow });
  }
  const frames = p.atlas.meta.globeFrames;
  const turn = lit ? Math.floor(p.clock / 110) % frames : 0;
  p.sprite(`globe-${turn}`, standLeft + 6 - p.cam, standTop + 2, { faded: !lit, alpha: faded ? 0.55 : 1 });
  p.standing("globe-stand", standLeft, standBottom, { faded, alpha: faded ? 0.55 : 1 });
  if (lit && stage.kind === "replay") {
    for (let k = 0; k < 6; k += 1) {
      p.sparkle(standLeft + 28 + Math.cos(k) * 30, standTop + 24 + Math.sin(k * 1.7) * 26, between(stage.p, GLOBE.light + k * 0.02, GLOBE.light + 0.1 + k * 0.02));
    }
  }
  if (faded) return;
  WORLD_KIDS.forEach((id, k) => {
    const at = GLOBE.firstGreeting + k * GLOBE.step;
    const t = stage.kind === "replay" ? stage.p : 1;
    const shown = between(t, at - 0.04, at);
    if (shown <= 0) return;
    const waving = stage.kind === "replay" && t < at + 0.12;
    const cheering = (stage.kind === "replay" && t > GLOBE.light) || celebrate > 0;
    const x = stop + WORLD_KID_X[k];
    const lift = cheering ? hop(((p.clock + k * 190) % 680) / 680, 4) : waving ? hop(between(t, at, at + 0.06), 4) : 0;
    p.person(p.front(id, cheering ? "cheer" : waving ? "wave" : "idle", k * 250), x, p.feet, { alpha: shown, lift });
    if ((stage.kind === "replay" || talking) && t >= at) p.bubble(greetings[k] ?? "", x, p.feet - 52 - (k % 2) * 13);
  });
}
