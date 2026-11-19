import type { JourneyContent } from "../content";
import type { Journey } from "../Journey";
import { MEMORY_COUNT, QUESTS, questX, stopX, type QuestId } from "../route";
import { between, hop, type Painter } from "./Painter";

/** How the pupil stands during a side quest, if not walking. */
export type PupilPose = { front: true; pose: "idle" | "wave" } | { front: false };

function questAt(journey: Journey, id: QuestId): number {
  const quest = QUESTS.find((q) => q.id === id);
  return quest ? questX(quest, journey.timing) : 0;
}

/** True between two moments of a quest, in milliseconds after it began. */
function during(age: number | null, from: number, to: number): boolean {
  return age !== null && age >= from && age < to;
}

/** A line fades in and out over its window. */
function lineAlpha(age: number | null, from: number, to: number): number {
  if (age === null || age < from || age >= to) return 0;
  return Math.min(1, (age - from) / 150, (to - age) / 200);
}

/** How the pupil should stand right now because of a side quest. */
export function pupilPose(journey: Journey): PupilPose {
  if (journey.current !== "walk" || !journey.holding) return { front: false };
  const waves: [QuestId, number, number][] = [["lola", 900, 2600], ["jeepney", 1600, 2800], ["garland", 1200, 2600]];
  for (const [id, from, to] of waves) {
    if (during(journey.questAge(id), from, to)) return { front: true, pose: "wave" };
  }
  if (during(journey.questAge("dog"), 900, 2600)) return { front: true, pose: "idle" };
  return { front: false };
}

/** What the pupil says during a quest, drawn above their head. */
export function pupilLine(journey: Journey, content: JourneyContent): { text: string; alpha: number } | null {
  const windows: [QuestId, number, number][] = [["lola", 900, 2600], ["ball", 600, 1700], ["jeepney", 1700, 2800], ["dog", 1000, 2500], ["garland", 1300, 2600]];
  for (const [id, from, to] of windows) {
    const alpha = lineAlpha(journey.questAge(id), from, to);
    if (alpha > 0) return { text: content.quests[id].you, alpha };
  }
  return null;
}

/** Everything along the road that stands behind the pupil. */
export function drawRoadsideBack(p: Painter, journey: Journey, content: JourneyContent) {
  drawLolaYard(p, journey, content);
  drawStore(p, journey);
  drawField(p, journey);
}

/** Everything along the road that passes in front of the pupil. */
export function drawRoadsideFront(p: Painter, journey: Journey, content: JourneyContent) {
  drawBall(p, journey, content);
  drawDog(p, journey, content);
  drawGarlandGirl(p, journey, content);
}

function drawLolaYard(p: Painter, journey: Journey, content: JourneyContent) {
  const q = questAt(journey, "lola");
  if (!p.visible(q - 20, q + 160)) return;
  const age = journey.questAge("lola");
  p.standing(`laundry-${Math.floor(p.clock / 600) % 2}`, q + 30, p.feet - 8);
  p.standing(`cat-${Math.floor(p.clock / 900) % 2}`, q + 132, p.feet - 6);
  const greeting = during(age, 0, 2200);
  const frame = greeting ? p.front("lola", "wave") : `lola-sweep-${Math.floor(p.clock / 380) % 2}`;
  p.person(frame, q + 44, p.feet - 2);
  p.bubble(content.quests.lola.them, q + 44, p.feet - 60, lineAlpha(age, 0, 1800));
  // The hens flutter up when the pupil arrives, then go back to pecking.
  ([[62, "hen"], [80, "rooster"], [98, "hen"]] as const).forEach(([dx, kind], k) => {
    const flutter = age !== null && age < 600 ? hop(age / 600, 6) : 0;
    const scatter = age !== null ? Math.min(14, Math.max(0, age) / 40) * (k % 2 ? 1 : -1) : 0;
    p.standing(`${kind}-${Math.floor((p.clock + k * 250) / 360) % 2}`, q + dx + scatter, p.feet - 1 - flutter);
  });
}

function drawStore(p: Painter, journey: Journey) {
  const q = questAt(journey, "ball");
  const left = q + 96;
  if (!p.visible(left, left + 140)) return;
  const bottom = p.feet - 8;
  const [, storeH] = p.size("store");
  const windowTop = bottom - storeH + 44;
  p.standing("store-inside", left + 26, windowTop + 34);
  // The tindera behind her counter, waving as the pupil passes.
  const near = Math.abs(journey.x - (left + 66)) < 120;
  p.person(p.front("tindera", near ? "wave" : "idle"), left + 66, windowTop + 56);
  p.standing("store", left, bottom);
  p.standing("bench", left - 34, p.feet - 4);
}

function drawBall(p: Painter, journey: Journey, content: JourneyContent) {
  const q = questAt(journey, "ball");
  if (!p.visible(q - 20, q + 100)) return;
  const age = journey.questAge("ball");
  const kidX = q + 64;
  let ballX = kidX - 8;
  let ballY = p.feet - 22 - Math.abs(Math.sin(p.clock / 220)) * 10;
  if (age !== null && age < 1500) {
    if (age < 500) {
      ballX = kidX - 8 - ((kidX - 8 - (q + 10)) * age) / 500;
      ballY = p.feet - 4 - Math.abs(Math.sin((age / 500) * Math.PI * 2)) * 8;
    } else if (age < 900) {
      ballX = q + 10;
      ballY = p.feet - 4;
    } else {
      const t = (age - 900) / 600;
      ballX = q + 10 + (kidX - 8 - q - 10) * t;
      ballY = p.feet - 4 - Math.sin(t * Math.PI) * 30;
    }
  }
  const thanking = during(age, 1400, 2600);
  p.person(p.front("toto", thanking ? "wave" : "idle"), kidX, p.feet + 1, { lift: thanking ? hop(((age ?? 0) - 1400) / 400, 3) : 0 });
  p.sprite("ball", ballX - p.cam - 4, ballY - 8);
  p.bubble(content.quests.ball.them, kidX, p.feet - 50, lineAlpha(age, 1400, 2600));
}

function drawField(p: Painter, journey: Journey) {
  const q = questAt(journey, "dog");
  if (!p.visible(q + 60, q + 220)) return;
  const plod = Math.floor(p.clock / 420) % 4;
  const drift = Math.sin(p.clock / 6000) * 12;
  p.standing(`carabao-${plod}`, q + 96 + drift, p.feet - 10);
  const near = Math.abs(journey.x - (q + 190)) < 160;
  p.person(p.front("farmer", near ? "wave" : "idle"), q + 186 + drift, p.feet - 8);
}

function drawDog(p: Painter, journey: Journey, content: JourneyContent) {
  const age = journey.questAge("dog");
  const q = questAt(journey, "dog");
  const church = stopX(MEMORY_COUNT, journey.timing);
  if (journey.current === "end") {
    p.standing(`dog-sit-${Math.floor(p.clock / 300) % 2}`, church + 16, p.feet + 12);
    return;
  }
  if (age === null) {
    if (p.visible(q + 30, q + 80)) p.standing(`dog-sit-${Math.floor(p.clock / 500) % 2}`, q + 46, p.feet + 2);
    return;
  }
  if (age < 2600) {
    if (age < 300) {
      p.standing("dog-bark", q + 46, p.feet + 2);
    } else if (age < 1000) {
      const t = (age - 300) / 700;
      const x = q + 46 + (q + 18 - q - 46) * t;
      p.standing(`dog-run-${Math.floor(age / 90) % 4}`, x, p.feet + 3, { flip: true });
    } else {
      p.standing(`dog-sit-${Math.floor(age / 160) % 2}`, q + 18, p.feet + 3);
      const heart = between(age, 1100, 2100);
      if (heart > 0 && heart < 1) p.sprite(`heart-${Math.floor(age / 200) % 2}`, q + 26 - p.cam, p.feet - 20 - heart * 14, { alpha: 1 - heart * 0.6 });
    }
    p.bubble(content.quests.dog.them, q + 58, p.feet - 22, lineAlpha(age, 0, 1100));
    return;
  }
  // From now on the dog walks with the pupil.
  const walking = journey.current === "walk" && !journey.holding;
  const x = journey.x - 34;
  if (walking) p.standing(`dog-run-${Math.floor(journey.x / 6) % 4}`, x, p.feet + 3);
  else p.standing(`dog-sit-${Math.floor(p.clock / 300) % 2}`, x, p.feet + 3);
}

function drawGarlandGirl(p: Painter, journey: Journey, content: JourneyContent) {
  const q = questAt(journey, "garland");
  if (!p.visible(q, q + 80)) return;
  const age = journey.questAge("garland");
  const offering = during(age, 0, 2800);
  p.person(p.front("nina", offering ? "wave" : "idle"), q + 34, p.feet + 1);
  p.bubble(content.quests.garland.them, q + 34, p.feet - 50, lineAlpha(age, 0, 1500));
  if (age !== null && age > 1300 && age < 2200) p.sparkle(q + 18, p.feet - 30, (age - 1300) / 900);
}
