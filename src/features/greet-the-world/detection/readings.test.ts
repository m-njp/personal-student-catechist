import { describe, expect, it } from "vitest";
import { defaultThresholds as t } from "./config";
import { bodyLevels, faceLevels, handLevels, restingFace, playerHandLevels } from "./readings";
import { hand, person, poses } from "./samplePoses";

const met = (value: number | undefined) => (value ?? 0) >= 1;

describe("hand signs", () => {
  it("reads a sign at or above the lowest score", () => {
    expect(met(handLevels([{ name: "Thumb_Up", score: 0.85 }], [], t).thumbsUp)).toBe(true);
    expect(met(handLevels([{ name: "Thumb_Up", score: 0.45 }], [], t).thumbsUp)).toBe(false);
  });

  it("keeps the stronger of two hands", () => {
    const levels = handLevels([{ name: "Victory", score: 0.5 }, { name: "Victory", score: 0.9 }], [], t);
    expect(levels.victory).toBeCloseTo(1.5);
  });

  it("reads a fist, and ignores gestures the game does not use", () => {
    expect(met(handLevels([{ name: "Closed_Fist", score: 0.9 }], [], t).fist)).toBe(true);
    expect(handLevels([{ name: "ILoveYou", score: 0.99 }, { name: "None", score: 0.9 }], [], t)).toEqual({});
  });

  it("reads point down from the hand's points: index down, other fingers curled", () => {
    expect(met(handLevels([], [hand()], t).pointingDown)).toBe(true);
    expect(met(handLevels([], [hand({ others: true })], t).pointingDown)).toBe(false);
    expect(met(handLevels([], [hand({ up: true })], t).pointingDown)).toBe(false);
  });
});

describe("body poses", () => {
  const onlyMet = (pose: ReturnType<typeof person>) =>
    Object.entries(bodyLevels(pose, t))
      .filter(([, value]) => met(value))
      .map(([name]) => name);

  it("reads each pose, and only that pose", () => {
    expect(onlyMet(poses.armsDown())).toEqual([]);
    expect(onlyMet(poses.armsRaised())).toEqual([]);
    expect(onlyMet(poses.handsOnHead())).toEqual(["handsOnHead"]);
    expect(onlyMet(poses.praying())).toEqual(["praying"]);
  });

  it("reads nothing from a body the model cannot see well", () => {
    const hidden = poses.armsRaised().map((point) => ({ ...point, visibility: 0.2 }));
    expect(bodyLevels(hidden, t)).toEqual({ handsOnHead: 0, praying: 0 });
  });
});

describe("feelings", () => {
  const none = {};

  it("reads a smile on both sides as happy", () => {
    expect(met(faceLevels({ mouthSmileLeft: 0.7, mouthSmileRight: 0.65 }, none, t).happy)).toBe(true);
    expect(met(faceLevels({ mouthSmileLeft: 0.7, mouthSmileRight: 0.1 }, none, t).happy)).toBe(false);
  });

  it("reads an open mouth with wide eyes or raised brows as surprised", () => {
    expect(met(faceLevels({ jawOpen: 0.6, eyeWideLeft: 0.4, eyeWideRight: 0.4 }, none, t).surprised)).toBe(true);
    expect(met(faceLevels({ jawOpen: 0.6 }, none, t).surprised)).toBe(false);
  });

  it("measures from the player's resting face, but never takes away more than half a threshold", () => {
    const resting = restingFace([{ mouthSmileLeft: 0.2, mouthSmileRight: 0.2 }], t);
    expect(met(faceLevels({ mouthSmileLeft: 0.55, mouthSmileRight: 0.55 }, resting, t).happy)).toBe(false);
    const smiling = restingFace([{ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }], t);
    expect(smiling.mouthSmileLeft).toBe(0.5 * t.smile);
  });
});


describe("two open palms", () => {
  const palm = (wrist: number, score = 0.9) => ({ wrist, points: hand({ others: true }), gesture: { name: "Open_Palm", score } });
  it("needs two distinct assigned wrists and uses the weaker score", () => {
    expect(playerHandLevels([palm(15)], t).twoOpenPalms).toBe(0);
    expect(playerHandLevels([palm(15), palm(15)], t).twoOpenPalms).toBe(0);
    expect(playerHandLevels([palm(15), palm(16, 0.66)], t).twoOpenPalms).toBeCloseTo(1.1);
    expect(met(playerHandLevels([palm(15), palm(16, 0.3)], t).twoOpenPalms)).toBe(false);
  });
  it("does not combine a palm with a fist or peace sign", () => {
    expect(playerHandLevels([palm(15), { ...palm(16), gesture: { name: "Victory", score: 0.99 } }], t).twoOpenPalms).toBe(0);
  });
  it("retains point up, peace sign and single palm recognition", () => {
    for (const [name, reading] of [["Pointing_Up", "pointingUp"], ["Victory", "victory"], ["Open_Palm", "openPalm"]] as const) {
      expect(met(handLevels([{ name, score: 0.9 }], [], t)[reading])).toBe(true);
    }
  });
});
