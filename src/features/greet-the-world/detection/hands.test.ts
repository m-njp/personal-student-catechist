import { describe, expect, it } from "vitest";
import { defaultThresholds as t } from "./config";
import { assignHands } from "./hands";
import { bodies } from "./players";
import { POSE } from "./geometry";
import { hand, person } from "./samplePoses";
const at = (x: number, y: number, scale = 1) => hand().map(p => ({ ...p, x: x + (p.x - 0.5) * scale, y: y + (p.y - 0.5) * scale }));
const players = bodies([person(0.5), person(1.3)], t).sort((a, b) => a.center.x - b.center.x);
describe("unique hand ownership", () => {
  it("assigns both wrists to each player without mixing players", () => {
    expect(assignHands([at(0.4, 0.78), at(0.6, 0.78), at(1.2, 0.78), at(1.4, 0.78)], players, t)).toEqual([
      { player: 0, wrist: POSE.leftWrist }, { player: 0, wrist: POSE.rightWrist },
      { player: 1, wrist: POSE.leftWrist }, { player: 1, wrist: POSE.rightWrist },
    ]);
  });
  it("rejects duplicates and small background hands", () => {
    expect(assignHands([at(0.4, 0.78), at(0.4, 0.78), at(0.6, 0.78, 0.1)], players, t).filter(Boolean)).toHaveLength(1);
  });
  it("rejects ambiguous and hidden wrists", () => {
    expect(assignHands([at(0.5, 0.78)], players, t)).toEqual([null]);
    const hidden = bodies([person(0.5).map(p => ({ ...p, visibility: 0.7 }))], t);
    expect(assignHands([at(0.4, 0.78)], hidden, { ...t, visibility: 0.8 })).toEqual([null]);
  });
  it("follows crossed wrists by pose anchors instead of screen order", () => {
    const crossed = bodies([person(0.5, { leftWrist: [0.65, 0.6], rightWrist: [0.35, 0.6] })], t);
    expect(assignHands([at(0.35, 0.6), at(0.65, 0.6)], crossed, t)).toEqual([{ player: 0, wrist: POSE.rightWrist }, { player: 0, wrist: POSE.leftWrist }]);
  });
});
