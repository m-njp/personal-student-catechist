import { describe, expect, it } from "vitest";
import { DetectionLog } from "./DetectionLog";

describe("detector logs", () => {
  it("keeps bounded events and raw scores without images or landmarks", () => {
    const log = new DetectionLog(2);
    for (let i = 0; i < 3; i++) {
      log.event({ what: "held", reading: "happy" });
      log.frame([{ happy: 1 }], { fps: 15, delegate: "CPU", targets: ["happy"], raw: [{ levels: { happy: 1.2 }, shapes: { mouthSmileLeft: 0.7 }, baseline: { mouthSmileLeft: 0.1 }, gesture: null }] });
    }
    const exported = JSON.parse(log.export({ smile: 0.5 })) as { frames: { raw: { shapes: Record<string, number> }[] }[]; events: unknown[] };
    expect(exported.frames).toHaveLength(2);
    expect(exported.events).toHaveLength(2);
    expect(exported.frames[0].raw[0].shapes.mouthSmileLeft).toBe(0.7);
    expect(log.export({})).not.toMatch(/landmarks|image|video/);
  });
});
