import { describe, expect, it } from "vitest";
import { defaultThresholds as t, tracking } from "./config";
import { POSE } from "./geometry";
import { bodies, ownFace, SubjectTracker, type Body } from "./players";
import { person } from "./samplePoses";

const aspect = 16 / 9;
const shirt = [1, 0, 0], other = [0, 1, 0];
const body = (x = aspect / 2, appearance: readonly number[] | null = shirt, width = 0.24): Body =>
  ({ ...bodies([person(x, {}, width)], t)[0], appearance });
function locked() {
  const tracker = new SubjectTracker();
  const player = body();
  tracker.observe([player], aspect, 0);
  expect(tracker.observe([player], aspect, tracking.confirmMs)).toBe(player);
  return { tracker, player };
}

describe("one stable player", () => {
  it("waits for a centered person to stand still before locking", () => {
    const tracker = new SubjectTracker();
    expect(tracker.observe([body(0.2)], aspect, 0)).toBeNull();
    expect(tracker.observe([body()], aspect, 100)).toBeNull();
    expect(tracker.observe([body()], aspect, 399)).toBeNull();
    expect(tracker.observe([body()], aspect, 400)).not.toBeNull();
  });
  it("does not acquire ambiguous candidates or hidden and distant bodies", () => {
    const tracker = new SubjectTracker();
    expect(tracker.observe([body(aspect / 2 - 0.03), body(aspect / 2 + 0.03)], aspect, 0)).toBeNull();
    const hidden = person(0.9).map((point, i) => i === POSE.leftShoulder ? { ...point, visibility: 0.1 } : point);
    expect(bodies([hidden, person(0.9, {}, 0.08)], t)).toEqual([]);
  });
  it("keeps the one player when another person enters or is wider", () => {
    const { tracker, player } = locked();
    const intruder = body(1.1, other, 0.34);
    expect(tracker.observe([intruder, player], aspect, 400)).toBe(player);
    expect(tracker.spot?.width).toBe(player.width);
  });
  it("pauses on an ambiguous crossing instead of swapping people", () => {
    const { tracker } = locked();
    expect(tracker.observe([body(0.86), body(0.92)], aspect, 400)).toBeNull();
    expect(tracker.spot).not.toBeNull();
  });
  it("locks without a clothing reading, or when the reading changes while still", () => {
    const tracker = new SubjectTracker();
    tracker.observe([body(aspect / 2, null)], aspect, 0);
    expect(tracker.observe([body(aspect / 2, null)], aspect, tracking.confirmMs)).not.toBeNull();
    const next = new SubjectTracker();
    next.observe([body(aspect / 2, shirt)], aspect, 0);
    expect(next.observe([body(aspect / 2, other)], aspect, tracking.confirmMs)).not.toBeNull();
  });
  it("keeps following a player whose clothing reading shifts frame to frame", () => {
    const { tracker } = locked();
    const shifted = body(aspect / 2, other);
    expect(tracker.observe([shifted], aspect, 400)).toBe(shifted);
  });
  it("rejects a different shirt in the tracked position after a loss", () => {
    const { tracker } = locked(); tracker.lose();
    expect(tracker.observe([body(aspect / 2, other)], aspect, 400)).toBeNull();
    expect(tracker.guidance).toBe("return");
  });
  it("retains the lock through prolonged loss and resumes the same player after confirmation", () => {
    const { tracker, player } = locked();
    tracker.observe([], aspect, 400);
    expect(tracker.observe([body(aspect / 2, other)], aspect, 60000)).toBeNull();
    expect(tracker.spot).toBe(player);
    expect(tracker.observe([player], aspect, 60100)).toBeNull();
    expect(tracker.guidance).toBe("hold");
    expect(tracker.observe([player], aspect, 60400)).toBe(player);
  });
  it("does not recover without appearance evidence", () => {
    const { tracker } = locked(); tracker.lose();
    expect(tracker.observe([body(aspect / 2, null)], aspect, 60000)).toBeNull();
    expect(tracker.observe([body(aspect / 2, null)], aspect, 90000)).toBeNull();
  });
  it("gives mirrored directions, distance and height guidance without accepting an unmatched person", () => {
    const { tracker } = locked();
    tracker.observe([body(1.3, other)], aspect, 400); expect(tracker.guidance).toBe("left");
    tracker.observe([body(0.5, other)], aspect, 500); expect(tracker.guidance).toBe("right");
    tracker.observe([body(aspect / 2, other, 0.15)], aspect, 600); expect(tracker.guidance).toBe("closer");
    tracker.observe([body(aspect / 2, other, 0.4)], aspect, 700); expect(tracker.guidance).toBe("back");
    const low = body(aspect / 2, other); low.center = { ...low.center, y: 0.7 };
    tracker.observe([low], aspect, 800); expect(tracker.guidance).toBe("up");
  });
  it("reset explicitly permits a new player", () => {
    const { tracker } = locked(); tracker.reset();
    const next = body(aspect / 2, other);
    expect(tracker.observe([next], aspect, 1000)).toBeNull();
    expect(tracker.observe([next], aspect, 1300)).toBe(next);
  });
});
describe("face ownership", () => {
  it("uses one visible nose and rejects ambiguous or background faces", () => {
    const player = body();
    const nose = player.pose[POSE.nose];
    expect(ownFace([[nose, nose]], player, t.visibility)).toBe(0);
    expect(ownFace([[nose, nose], [nose, nose]], player, t.visibility)).toBe(-1);
    expect(ownFace([[nose, { ...nose, x: nose.x + 1 }]], player, t.visibility)).toBe(-1);
    const hidden = { ...player, pose: player.pose.map(point => ({ ...point, visibility: 0.1 })) };
    expect(ownFace([[nose, nose]], hidden, t.visibility)).toBe(-1);
  });
});
