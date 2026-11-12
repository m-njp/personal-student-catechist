import { describe, expect, it } from "vitest";
import { defaultThresholds as t } from "./config";
import { assignHands } from "./hands";
import { bodies } from "./players";
import { POSE } from "./geometry";
import { hand, person } from "./samplePoses";
const at = (x: number, y: number, scale = 1) => hand().map(p => ({ ...p, x: x + (p.x - 0.5) * scale, y: y + (p.y - 0.5) * scale }));
const player = bodies([person(0.5)], t)[0];
describe("one player's hand ownership", () => {
  it("assigns at most two hands and excludes another person's hands", () => {
    expect(assignHands([at(0.4, 0.78), at(0.6, 0.78), at(1.2, 0.78), at(1.4, 0.78)], player, t)).toEqual([POSE.leftWrist, POSE.rightWrist, null, null]);
  });
  it("rejects duplicate and small background hands", () => {
    expect(assignHands([at(0.4, 0.78), at(0.4, 0.78), at(0.6, 0.78, 0.1)], player, t).filter(wrist => wrist !== null)).toHaveLength(1);
  });
  it("rejects ambiguous and hidden wrists", () => {
    expect(assignHands([at(0.5, 0.78)], player, t)).toEqual([null]);
    const hidden = bodies([person(0.5).map(p => ({ ...p, visibility: 0.7 }))], t)[0];
    expect(assignHands([at(0.4, 0.78)], hidden, { ...t, visibility: 0.8 })).toEqual([null]);
  });
  it("follows crossed wrists by pose anchors", () => {
    const crossed = bodies([person(0.5, { leftWrist: [0.65, 0.6], rightWrist: [0.35, 0.6] })], t)[0];
    expect(assignHands([at(0.35, 0.6), at(0.65, 0.6)], crossed, t)).toEqual([POSE.rightWrist, POSE.leftWrist]);
  });
});
