import { describe, expect, it } from "vitest";
import { DetectionLog } from "./DetectionLog";
import { lighting } from "./lighting";

/** A 4 by 2 frame of one gray, with the left half a second gray. */
function frame(room: number, left: number): number[] {
  const pixels: number[] = [];
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 4; x++) {
      const gray = x < 2 ? left : room;
      pixels.push(gray, gray, gray, 255);
    }
  }
  return pixels;
}

const player = { left: 0, top: 0, right: 0.5, bottom: 1 };

describe("the lighting check", () => {
  it("passes an evenly lit room", () => {
    expect(lighting(frame(150, 140), 4, 2, [player])).toBe("ok");
  });

  it("finds players dark against a bright window", () => {
    expect(lighting(frame(240, 70), 4, 2, [player])).toBe("backlit");
  });

  it("finds a room too dark to read", () => {
    expect(lighting(frame(30, 30), 4, 2, [player])).toBe("dark");
    expect(lighting(frame(30, 30), 4, 2, [])).toBe("dark");
  });
});

describe("the detection log", () => {
  it("keeps only the latest entries", () => {
    const log = new DetectionLog(3);
    for (let i = 0; i < 5; i++) log.event({ what: "on", player: "blue", reading: "happy" });
    expect(log.getSnapshot().map((event) => event.n)).toEqual([3, 4, 5]);
  });

  it("exports numbers only, with the thresholds used", () => {
    const log = new DetectionLog();
    log.frame([{ happy: 0.8 }, null]);
    const exported = JSON.parse(log.export({ smile: 0.5 }));
    expect(exported).toMatchObject({ thresholds: { smile: 0.5 }, events: [], frames: [{ levels: [{ happy: 0.8 }, null] }] });
  });
});
