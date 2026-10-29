import { describe, expect, it } from "vitest";
import { greet } from "@/content/lessons/lesson-04/greet";
import type { CameraView, PlayerView } from "./CameraLoop";
import { setupSigns, setupStatus } from "./setupStatus";

const signs = setupSigns(greet);
const player: PlayerView = { found: true, face: true, on: [], held: [] };
const ready = (overrides: Partial<CameraView> = {}): CameraView => ({
  status: "running",
  error: null,
  aspect: 16 / 9,
  locked: true,
  players: [player],
  detected: 1,
  light: "ok",
  passed: signs,
  ...overrides,
});

describe("the signs to test", () => {
  it("are every sign the questions use, plus two open palms for the final round, once each", () => {
    expect(signs).toEqual(expect.arrayContaining(["thumbsUp", "openPalm", "happy", "surprised", "praying", "handsOnHead", "twoOpenPalms"]));
    expect(new Set(signs).size).toBe(signs.length);
  });
});

describe("setup completion", () => {
  it("starts with every sign left before the camera opens", () => {
    expect(setupStatus(null, signs)).toEqual({ ready: false, complete: false, done: 0, total: signs.length, remaining: signs });
  });

  it("completes once a found player has held every sign", () => {
    expect(setupStatus(ready(), signs)).toMatchObject({ ready: true, complete: true, done: signs.length });
  });

  it("lists the signs left in order and counts a repeat once", () => {
    const state = setupStatus(ready({ passed: ["happy", "happy"] }), signs);
    expect(state.done).toBe(1);
    expect(state.remaining).toEqual(signs.filter((reading) => reading !== "happy"));
  });

  it("needs a running camera and a found player even after the signs pass", () => {
    expect(setupStatus(ready({ status: "starting" }), signs).complete).toBe(false);
    expect(setupStatus(ready({ locked: false }), signs).complete).toBe(false);
    expect(setupStatus(ready({ players: [player, { ...player, found: false }] }), signs).complete).toBe(false);
  });

  it("does not wait on lighting advice", () => {
    expect(setupStatus(ready({ light: "backlit" }), signs).complete).toBe(true);
  });
});
