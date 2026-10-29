import { describe, expect, it } from "vitest";
import { LandmarkSmoother } from "./LandmarkSmoother";
const point = (x: number, visibility = 1) => [{ x, y: 0.5, visibility }];
describe("overlay smoothing", () => {
  it("eases positions without changing detection input", () => {
    const smooth = new LandmarkSmoother(35, 250); smooth.read("hand", point(0), 0, 0.6);
    const input = point(1); const output = smooth.read("hand", input, 40, 0.6);
    expect(output[0].x).toBeGreaterThan(0); expect(output[0].x).toBeLessThan(1); expect(input[0].x).toBe(1);
  });
  it("never carries hidden or stale joints into a new observation", () => {
    const smooth = new LandmarkSmoother(35, 250); smooth.read("body", point(0), 0, 0.6);
    expect(smooth.read("body", point(1, 0.1), 40, 0.6)).toEqual(point(1, 0.1));
    expect(smooth.read("body", point(2), 80, 0.6)).toEqual(point(2));
    smooth.retain(new Set()); expect(smooth.read("body", point(3), 120, 0.6)).toEqual(point(3));
    expect(smooth.read("body", point(4), 500, 0.6)).toEqual(point(4));
  });
});
