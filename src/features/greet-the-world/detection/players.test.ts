import { describe, expect, it } from "vitest";
import { defaultThresholds as t } from "./config";
import { POSE, type Point } from "./geometry";
import { bodies, follow, lockPlayers, owners } from "./players";
import { person } from "./samplePoses";

const near = (x: number) => person(x, {}, 0.24);
const behind = (x: number) => person(x, {}, 0.09);
const at = (x: number, y: number): Point => ({ x, y, visibility: 1 });

describe("finding the two closest players", () => {
  it("locks the two widest bodies, Blue on the left, and never someone behind them", () => {
    const pair = lockPlayers(bodies([behind(0.9), near(1.2), near(0.6)], t));
    expect(pair?.map((spot) => spot.center.x)).toEqual([expect.closeTo(0.6), expect.closeTo(1.2)]);
  });

  it("locks a lone player without taking someone far behind as the second", () => {
    expect(lockPlayers(bodies([near(0.9), behind(1.2)], t))).toHaveLength(1);
    expect(lockPlayers([])).toBeNull();
  });

  it("never counts a pupil sitting at the back, smaller than the player size", () => {
    const seated = person(0.9, {}, t.playerSize * 0.7);
    expect(bodies([seated, near(0.6)], t)).toHaveLength(1);
    expect(lockPlayers(bodies([seated], t))).toBeNull();
  });

  it("skips a body whose shoulders are hidden", () => {
    const hidden = near(0.9).map((point, i) => (i === POSE.leftShoulder ? { ...point, visibility: 0.1 } : point));
    expect(bodies([hidden], t)).toEqual([]);
  });
});

describe("following the locked players", () => {
  const spots = lockPlayers(bodies([near(0.6), near(1.2)], t));
  if (!spots) throw new Error("expected a pair");

  it("keeps each player as they move a little, so the labels never swap", () => {
    const [blue, orange] = follow(spots, bodies([near(1.15), near(0.65)], t));
    expect(blue?.center.x).toBeCloseTo(0.65);
    expect(orange?.center.x).toBeCloseTo(1.15);
  });

  it("never lets someone behind take a player's place", () => {
    const [blue, orange] = follow(spots, bodies([behind(0.6), near(1.2)], t));
    expect(blue).toBeNull();
    expect(orange?.center.x).toBeCloseTo(1.2);
  });

  it("loses a player who jumps too far in one frame", () => {
    expect(follow(spots, bodies([near(1.5), near(1.2)], t))[0]).toBeNull();
  });
});

describe("giving hands and faces to players", () => {
  const players = follow(lockPlayers(bodies([near(0.6), near(1.2)], t)) ?? [], bodies([near(0.6), near(1.2)], t));

  it("gives a hand to the player whose wrist it is near", () => {
    const blueWrist = players[0]?.pose[POSE.rightWrist] ?? at(0, 0);
    expect(owners([at(blueWrist.x + 0.02, blueWrist.y)], players, [POSE.leftWrist, POSE.rightWrist])).toEqual([0]);
  });

  it("gives no one a hand or face far from both players", () => {
    expect(owners([at(0.9, 0.2)], players, [POSE.leftWrist, POSE.rightWrist])).toEqual([-1]);
    expect(owners([at(0.9, 0.2)], players, [POSE.nose])).toEqual([-1]);
  });

  it("refuses a small hand near a player's wrist, from someone sitting behind them", () => {
    const wrist = players[0]?.pose[POSE.rightWrist] ?? at(0, 0);
    const width = players[0]?.width ?? 0;
    const anchors = [POSE.leftWrist, POSE.rightWrist];
    expect(owners([wrist], players, anchors, [0.5 * width])).toEqual([0]);
    expect(owners([wrist], players, anchors, [0.1 * width])).toEqual([-1]);
  });

  it("gives a face to the player whose nose it is on", () => {
    const orangeNose = players[1]?.pose[POSE.nose] ?? at(0, 0);
    expect(owners([orangeNose], players, [POSE.nose])).toEqual([1]);
  });
});
