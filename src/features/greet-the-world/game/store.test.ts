import { describe, expect, it } from "vitest";
import type { StateStorage } from "zustand/middleware";
import { defaultThresholds, hold, tunables } from "../detection/config";
import { createGreetStore, sanitize } from "./store";

const groups = { min: 2, max: 8 };

function memory(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (name) => data[name] ?? null,
    setItem: (name, value) => {
      data[name] = value;
    },
    removeItem: (name) => {
      delete data[name];
    },
  };
}

describe("reading a save", () => {
  it("starts fresh from nothing", () => {
    const saved = sanitize(undefined, groups);
    expect(saved.league.scores).toEqual([0, 0]);
    expect(saved.settings.thresholds).toEqual(defaultThresholds);
    expect(saved.settings.holdMs).toBe(hold.initial);
  });

  it("drops settings an older version saved, such as face data", () => {
    const settings = sanitize({ settings: { playerCount: 2, calibration: { mouthSmileLeft: 0.2 } } }, groups).settings;
    expect(settings).not.toHaveProperty("playerCount");
    expect(settings).not.toHaveProperty("calibration");
  });

  it("repairs broken scores and keeps the group count in range", () => {
    const saved = sanitize({ league: { scores: [50, "x", -10, 1, 2, 3, 4, 5, 6, 7], played: [true] } }, groups);
    expect(saved.league.scores).toEqual([50, 0, 0, 1, 2, 3, 4, 5]);
    expect(saved.league.played).toEqual([true, false, false, false, false, false, false, false]);
  });

  it("clamps thresholds the teacher can change, and fills missing ones", () => {
    const saved = sanitize({ settings: { thresholds: { smile: 5 }, holdMs: 99_999 } }, groups);
    expect(saved.settings.thresholds.smile).toBe(tunables.smile.max);
    expect(saved.settings.thresholds.jawOpen).toBe(defaultThresholds.jawOpen);
    expect(saved.settings.holdMs).toBe(hold.max);
  });
});

describe("obsolete settings", () => {
  it("drops removed detector thresholds while preserving scores and hold time", () => {
    const saved = sanitize({ league: { scores: [100, 200] }, settings: { holdMs: 900, thresholds: { armsWideSpread: 3, waveSwings: 4, smoothFrames: 5 } } }, groups);
    expect(saved.league.scores).toEqual([100, 200]); expect(saved.settings.holdMs).toBe(900);
    expect(saved.settings.thresholds).toEqual(defaultThresholds);
  });
});

describe("the store", () => {
  it("signals teacher resets without persisting the transient signal", () => {
    const storage = memory();
    const first = createGreetStore(groups, () => storage);
    first.getState().dispatch({ type: "setScore", group: 0, score: 100 });
    expect(first.getState().resetSerial).toBe(0);
    first.getState().dispatch({ type: "reset" });
    expect(first.getState().resetSerial).toBe(1);
    first.getState().dispatch({ type: "reset" });
    expect(first.getState().resetSerial).toBe(2);
    expect(JSON.parse(storage.data["lesson-04/greet-the-world"]).state).not.toHaveProperty("resetSerial");
    expect(createGreetStore(groups, () => storage).getState().resetSerial).toBe(0);
  });

  it("restores a completed quiz turn without persisting its camera or active card", () => {
    const storage = memory();
    const first = createGreetStore(groups, () => storage);
    first.getState().dispatch({ type: "finishMatch", group: 1, points: 1050 });
    const second = createGreetStore(groups, () => storage);
    expect(second.getState().league).toMatchObject({ scores: [0, 1050], played: [false, true] });
    expect(JSON.parse(storage.data["lesson-04/greet-the-world"]).state).not.toHaveProperty("challenge");
  });

  it("saves scores and settings, and a new store reads them back", () => {
    const storage = memory();
    const first = createGreetStore(groups, () => storage);
    first.getState().dispatch({ type: "setGroups", count: 3 });
    first.getState().dispatch({ type: "setScore", group: 2, score: 160 });
    first.getState().setSettings({ noCamera: true });

    const second = createGreetStore(groups, () => storage);
    expect(second.getState().league.scores).toEqual([0, 0, 160]);
    expect(second.getState().settings.noCamera).toBe(true);
  });

  it("keeps a save from another version instead of dropping it", () => {
    const old = JSON.stringify({ state: { league: { scores: [10, 20, 30] } }, version: 0 });
    const store = createGreetStore(groups, () => memory({ "lesson-04/greet-the-world": old }));
    expect(store.getState().league.scores).toEqual([10, 20, 30]);
  });
});
