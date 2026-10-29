import { describe, expect, it } from "vitest";
import { defaultThresholds as t } from "./config";
import { heldSince, smooth, type Steady } from "./steady";

describe("time-based confirmation", () => {
  it.each([20, 40, 60, 100])("confirms after elapsed time at %i ms intervals", interval => {
    let state: Steady | undefined;
    let first = -1;
    for (let at = 0; at <= 400; at += interval) {
      state = smooth(state, 1.2, t, at);
      if (state.on && first < 0) first = at;
    }
    expect(first).toBeGreaterThanOrEqual(t.settleMs);
    expect(first).toBeLessThan(t.settleMs + interval);
  });
  it("ignores transient noise and uses hysteresis to release", () => {
    let state = smooth(undefined, 0, t, 0);
    state = smooth(state, 1.2, t, 40);
    state = smooth(state, 0, t, 80);
    expect(state.on).toBe(false);
    state = smooth(state, 1.2, t, 120);
    state = smooth(state, 1.2, t, 200);
    expect(state.on).toBe(true);
    state = smooth(state, 0.95, t, 240);
    expect(state.on).toBe(true);
    state = smooth(state, 0, t, 280);
    expect(state.on).toBe(true);
    expect(smooth(state, 0, t, 360).on).toBe(false);
  });
  it("eases strength consistently at different rates", () => {
    const run = (interval: number) => {
      let state = smooth(undefined, 0, t, 0);
      for (let at = interval; at <= 240; at += interval) state = smooth(state, 1.5, t, at);
      return state.shown;
    };
    expect(run(20)).toBeCloseTo(run(60));
    expect(run(20)).toBeLessThanOrEqual(1);
  });
  it("resets hold time on loss", () => {
    expect(heldSince(null, true, 100)).toBe(100);
    expect(heldSince(100, true, 500)).toBe(100);
    expect(heldSince(100, false, 600)).toBeNull();
  });
});
