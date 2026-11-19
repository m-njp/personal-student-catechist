import type { JourneyContent } from "../content";
import type { Journey } from "../Journey";
import { FIESTA, JEEPNEY, MEMORY_COUNT, stopX } from "../route";
import { between, ease, hash, hop, VIEW_H, type Painter, type Pose } from "./Painter";

/** Who stands where at the Church, as offsets from the door. Two groups leave the open doorway clear. */
const BACK_ROW: readonly [string, number][] = [["bea", -84], ["tatay", -66], ["nanay", -48], ["father", 32], ["president", 50], ["principal", 68]];
const FRONT_ROW: readonly [string, number][] = [
  ["joy", -124], ["jun", -110], ["mia", -96], ["carla", -82], ["ana", -68], ["ben", -54], ["marco", -40],
  ["ella", 40], ["dino", 54], ["amira", 68], ["kofi", 82], ["lena", 96], ["hiro", 110],
];
/** The plaza's vendors, who cheer along at the fiesta. */
const VENDORS: readonly [string, number][] = [["balloon", -150], ["candle", 182], ["sorbetero", 262], ["vendor", 330]];
const FIREWORK_COLORS = ["gold", "pink", "blue"];
const FIREWORK_X = [-120, 70, -30, 140, -160, 20, 110, -80, 160, -10];

function door(journey: Journey): number {
  return stopX(MEMORY_COUNT, journey.timing);
}

/** Milliseconds since arriving at the Church, or -1 before. */
function fiestaMs(journey: Journey): number {
  return journey.current === "end" ? journey.phaseMs : -1;
}

/** The sky above the Church: the warm glow, light rays, and fireworks. Drawn behind the Church. */
export function drawChurchSky(p: Painter, journey: Journey) {
  const t = fiestaMs(journey);
  if (t < 0) return;
  const c = door(journey);
  const [gw, gh] = p.size("glow-big");
  const pulse = 0.85 + Math.sin(p.clock / 700) * 0.15;
  p.sprite("glow-big", c - gw / 2 - p.cam, p.feet - 96 - gh / 2, { alpha: ease(t / 3000) * pulse });
  for (let ms = FIESTA.fireworksFrom, k = 0; ms < FIESTA.fireworksTo; ms += FIESTA.fireworkEvery, k += 1) {
    const age = t - ms - 600;
    if (age < 0 || age > 900) continue;
    const frame = Math.min(5, Math.floor(age / 140));
    const [fw, fh] = p.size("firework-gold-0");
    const x = c + FIREWORK_X[k % FIREWORK_X.length];
    const y = 30 + ((k * 37) % 50);
    p.sprite(`firework-${FIREWORK_COLORS[k % 3]}-${frame}`, x - fw / 2 - p.cam, y - fh / 2, { alpha: 1 - Math.max(0, age - 700) / 200 });
  }
  for (let ms = FIESTA.fireworksFrom, k = 0; ms < FIESTA.fireworksTo; ms += FIESTA.fireworkEvery, k += 1) {
    const rise = (t - ms) / 600;
    if (rise <= 0 || rise >= 1) continue;
    const x = c + FIREWORK_X[k % FIREWORK_X.length];
    const y = 30 + ((k * 37) % 50);
    p.sparkle(x, VIEW_H - 60 - (VIEW_H - 60 - y) * ease(rise), 0.3);
  }
}

/** The plaza, the Church, its bell, the lamps, and the vendors around it. */
export function drawChurch(p: Painter, journey: Journey, content: JourneyContent) {
  const c = door(journey);
  const meta = p.atlas.meta;
  const churchLeft = c - (meta.door[0] + meta.door[2] / 2);
  const [, h] = p.size("church");
  if (!p.visible(c - 440, c + 420)) return;
  const t = fiestaMs(journey);
  const bottom = p.feet - 4;
  const [pw] = p.size("plaza");
  p.standing("plaza", c - pw / 2, p.feet + 8);
  if (t >= 0) {
    const [rw] = p.size("rays");
    const doorBottom = bottom - h + meta.door[1] + meta.door[3];
    p.sprite("rays", c - rw / 2 - p.cam, doorBottom - 140, { alpha: ease(t / 2500) * (0.6 + Math.sin(p.clock / 900) * 0.25) });
  }
  p.standing("church", churchLeft, bottom);
  // The bell swings while it rings, then settles.
  const bellRinging = t >= 0 && t < FIESTA.bells[FIESTA.bells.length - 1] + 1400;
  const swing = bellRinging ? Math.floor(t / 225) % 4 : 1;
  const bellFrame = [0, 1, 3, 2][swing];
  p.sprite(`bell-${bellFrame}`, churchLeft + 36 - 13 - p.cam, bottom - h + 178 - 137);
  const [lw] = p.size("door-light");
  p.sprite("door-light", c - lw / 2 - p.cam, p.feet - 8, { alpha: t >= 0 ? 0.6 + ease(t / 2000) * 0.4 : 0.45 });
  for (const dx of [-122, 122]) p.standing(t >= 0 ? "lamp-lit" : "lamp", c + dx - 9, p.feet - 8);
  // The plaza: a candle stall, a sorbetes cart, a fishball cart, and a tricycle waiting for riders.
  p.standing(`candles-${Math.floor(p.clock / 300) % 2}`, c + 132, p.feet - 6);
  p.standing("sorbetes", c + 196, p.feet - 4);
  p.standing("fishball", c + 276, p.feet - 6);
  p.standing("tricycle", c + 352, p.feet - 2);
  drawJeepneyStop(p, journey, content, c, t);
  const cheer = t >= FIESTA.cheer;
  const calling = !cheer && p.clock % 5200 < 1400;
  VENDORS.forEach(([id, dx], k) => {
    const lift = cheer ? hop(((p.clock + k * 210) % 760) / 760, 3) : 0;
    const pose = cheer ? "cheer" : id === "sorbetero" && calling ? "wave" : "idle";
    p.person(p.front(id, pose, k * 500), c + dx, p.feet - 2, { lift });
    if (id === "sorbetero" && calling) p.bubble(content.sorbetes, c + dx, p.feet - 60, Math.min(1, (p.clock % 5200) / 150));
    if (id === "balloon") {
      const [bw, bh] = p.size("balloons-0");
      p.sprite(`balloons-${Math.floor(p.clock / 500) % 2}`, c + dx - 8 - bw / 2 - p.cam, p.feet - 24 - bh - lift);
    }
  });
  // A big sister with her basket strolls across the plaza.
  if (t < 0) {
    const span = 520;
    const along = (p.clock * 0.02) % (span * 2);
    const goingRight = along < span;
    const x = c - span / 2 + (goingRight ? along : span * 2 - along);
    p.person(`ate-walk-${Math.floor(along / 5) % 8}`, x, p.feet - 6, { side: true, flip: !goingRight });
  }
}

/**
 * The jeepney pulls up at the plaza as the pupil arrives, Lola and Lolo step off and walk into the
 * Church, and the jeepney stays parked with its driver for the fiesta.
 */
function drawJeepneyStop(p: Painter, journey: Journey, content: JourneyContent, c: number, fiesta: number) {
  const age = fiesta >= 0 ? 1e9 : journey.questAge("jeepney");
  if (age === null) return;
  const parked = c + JEEPNEY.parkedLeft;
  const arrive = ease(age / JEEPNEY.arriveMs);
  const left = parked - 440 * (1 - arrive);
  const moving = arrive < 1;
  const frame = moving ? `jeepney-${Math.floor(left / 6) % 2 === 0 ? 0 : 1}` : "jeepney-0";
  p.standing(frame, left, p.feet - 2 + (moving ? Math.round(Math.sin(age / 90)) * 0.5 : 0));
  if (moving) return;
  const since = age - JEEPNEY.arriveMs;
  p.bubble(content.quests.jeepney.them, parked + 104, p.feet - 72, Math.max(0, Math.min(1, since / 150, (1300 - since) / 200)));
  // The driver steps down and waits by his jeepney.
  p.person(p.front("driver", since < 1600 ? "wave" : "idle"), parked + 156, p.feet - 1, { alpha: Math.min(1, since / 300) });
  if (fiesta >= 0) return;
  // Lola and Lolo get off at the back and walk to the Church door, then go in.
  (["lola", "lolo"] as const).forEach((id, k) => {
    const walked = (since - 300 - k * 500) * 0.032;
    if (walked < 0) return;
    const x = parked + 8 + walked;
    const fade = between(x, c - 60, c - 20);
    if (fade >= 1) return;
    p.person(`${id}-walk-${Math.floor(walked / 5) % 8}`, x, p.feet - 4, { side: true, alpha: 1 - fade });
  });
}

/** Everyone together in front of the Church, then the fiesta: bunting, doves, confetti, and cheering. */
export function drawFiesta(p: Painter, journey: Journey) {
  const t = fiestaMs(journey);
  if (t < 0) return;
  const c = door(journey);
  const cheering = t >= FIESTA.cheer && t < FIESTA.cheer + 2600;
  const late = t >= FIESTA.cheer + 2600;
  const appear = (k: number) => between(t, 400 + k * 110, 700 + k * 110);
  const poseFor = (k: number): Pose => {
    if (cheering) return "cheer";
    if (late && (p.clock / 1000 + k * 1.3) % 7 < 1.1) return "wave";
    return "idle";
  };
  const liftFor = (k: number, a: number) => (a < 1 ? (1 - a) * 6 : cheering ? hop(((p.clock + k * 130) % 640) / 640, 5) : 0);
  // Bunting unrolls across the plaza.
  const unroll = ease(between(t, FIESTA.bunting, FIESTA.bunting + 1400));
  if (unroll > 0) {
    const [bw, bh] = p.size("banderitas-0");
    const frame = `banderitas-${Math.floor(p.clock / 400) % 2}`;
    p.sprite(frame, c - 160 - p.cam, 66, { crop: [0, 0, Math.round(bw * unroll), bh] });
    p.sprite(frame, c - 140 - p.cam, 88, { crop: [0, 0, Math.round(bw * unroll), bh] });
  }
  BACK_ROW.forEach(([id, dx], k) => {
    const a = appear(k);
    if (a > 0) p.person(p.front(id, poseFor(k), k * 300), c + dx, p.feet - 7, { alpha: a, lift: liftFor(k, a) });
  });
  FRONT_ROW.forEach(([id, dx], k) => {
    const a = appear(k + BACK_ROW.length);
    if (a > 0) p.person(p.front(id, poseFor(k + 6), k * 260), c + dx, p.feet + 1, { alpha: a, lift: liftFor(k + 6, a) });
  });
  // The pupil steps into the light, turned to face everyone.
  const pupilPose: Pose = cheering ? "cheer" : t < 1400 || (late && (p.clock / 1000) % 6 < 1.2) ? "wave" : "idle";
  p.person(p.front("pupil", pupilPose), c, p.feet + 1 + 11 * ease(t / 900), { lift: cheering ? hop(((p.clock + 90) % 600) / 600, 5) : 0 });
  // A flock of doves rises from the Church.
  for (let k = 0; k < 7; k += 1) {
    const fly = (t - FIESTA.doves - k * 120) / 2600;
    if (fly <= 0 || fly >= 1) continue;
    const side = k % 2 ? 1 : -1;
    const x = c + side * (12 + fly * (90 + k * 26));
    const y = p.feet - 40 - fly * (170 + (k % 3) * 20) + Math.sin(fly * 9 + k) * 4;
    const [dw, dh] = p.size("dove-0");
    p.sprite(`dove-${Math.floor((p.clock + k * 60) / 110) % 4}`, x - dw / 2 - p.cam, y - dh / 2, { flip: side < 0 });
  }
  // The dove from Lesson 1 circles above the Church.
  if (t > 1000) {
    const fly = (t - 1000) / 1000;
    const arrive = ease(fly / 2.2);
    const angle = fly * 0.9;
    const x = c + 260 * (1 - arrive) + Math.cos(angle) * 46 * arrive;
    const y = 40 + Math.sin(angle * 2) * 8 - (1 - arrive) * 20;
    const facingLeft = arrive < 1 || Math.sin(angle) > 0;
    const [dw, dh] = p.size("dove-0");
    p.sprite(`dove-${Math.floor(p.clock / 120) % 4}`, x - p.cam - dw / 2, y - dh / 2, { flip: facingLeft });
  }
  for (let k = 0; k < 8; k += 1) {
    const cycle = (t / 2600 + k / 8) % 1;
    p.sparkle(c - 120 + ((k * 37) % 240), p.feet - 30 - cycle * 120, t > 600 ? Math.sin(cycle * Math.PI) * 0.99 : 0);
  }
  drawConfetti(p, t - FIESTA.cheer, 4200, c);
}

/** Confetti falling across the screen for a while, starting at `age` 0. */
export function drawConfetti(p: Painter, age: number, lasts: number, centerX: number) {
  if (age < 0 || age > lasts) return;
  const fade = Math.min(1, (lasts - age) / 600);
  for (let k = 0; k < 70; k += 1) {
    const seed = hash(`c${k}`);
    const speed = 0.045 + (seed % 40) / 1000;
    const y = -10 + ((age * speed + (seed % 120)) % (VIEW_H + 20)) - 20 * (seed % 3);
    if (y < -8) continue;
    const x = centerX - p.width / 2 + ((seed * 13) % Math.max(1, Math.round(p.width))) + Math.sin(age / 300 + k) * 6;
    p.sprite(`confetti-${(k + Math.floor(age / 200)) % 6}`, x - p.cam, y, { alpha: fade });
  }
}
