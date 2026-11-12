import { describe, expect, it } from "vitest";
import { appearance, type Sample } from "./appearance";
import { bodies } from "./players";
import { defaultThresholds as t, tracking } from "./config";
import { POSE } from "./geometry";
import { person } from "./samplePoses";
const player = bodies([person(0.9)], t)[0];
function sample(red: number, green: number, blue: number): Sample {
  return { width: 64, height: 48, data: Uint8ClampedArray.from({ length: 64 * 48 * 4 }, (_, i) => [red, green, blue, 255][i % 4]) };
}
describe("temporary torso appearance", () => {
  it("normalizes a tiny histogram and distinguishes clothing colors", () => {
    const red = appearance(player, sample(200, 30, 30), 16 / 9, t.visibility)!;
    const blue = appearance(player, sample(30, 30, 200), 16 / 9, t.visibility)!;
    expect(red.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(red).not.toEqual(blue);
  });
  it("tolerates exposure changes and avoids sharp histogram boundaries", () => {
    const dim = appearance(player, sample(90, 45, 30), 16 / 9, t.visibility)!;
    const bright = appearance(player, sample(180, 90, 60), 16 / 9, t.visibility)!;
    const jitter = appearance(player, sample(92, 44, 31), 16 / 9, t.visibility)!;
    const gap = (other: readonly number[]) => dim.reduce((sum, value, i) => sum + Math.abs(value - other[i]), 0) / 2;
    expect(gap(bright)).toBeLessThan(0.15);
    expect(gap(jitter)).toBeLessThan(0.05);
  });
  it("stays steady on a striped shirt when the shoulders wobble by a pixel", () => {
    // The camera loop's sample size, with stripes two pixels wide.
    const width = 160, height = 90;
    const stripes: Sample = { width, height, data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => {
      const x = Math.floor(i / 4) % width;
      return Math.floor(x / 2) % 2 ? [230, 230, 230, 255][i % 4] : [200, 30, 30, 255][i % 4];
    }) };
    const step = (16 / 9) / width;
    const moved = { ...player, center: { ...player.center, x: player.center.x + step },
      pose: player.pose.map(point => ({ ...point, x: point.x + step })) };
    const a = appearance(player, stripes, 16 / 9, t.visibility)!;
    const b = appearance(moved, stripes, 16 / 9, t.visibility)!;
    expect(a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / 2).toBeLessThan(tracking.appearanceGap);
  });
  it("omits missing samples but supports a torso with hips below the frame", () => {
    expect(appearance(player, null, 16 / 9, t.visibility)).toBeNull();
    const hidden = { ...player, pose: player.pose.map((point, i) => i === POSE.leftHip ? { ...point, visibility: 0 } : point) };
    expect(appearance(hidden, sample(100, 100, 100), 16 / 9, t.visibility)).not.toBeNull();
  });
});
