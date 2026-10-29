import { describe, expect, it } from "vitest";
import { initialLeague, reduceLeague, type League } from "./rules";

const limits = { min: 2, max: 8 };

describe("setting the number of groups", () => {
  it("keeps the scores of groups that stay and starts new groups at zero", () => {
    const league: League = { ...initialLeague(2), scores: [120, 340], played: [true, false] };
    const next = reduceLeague(league, { type: "setGroups", count: 4 }, limits);
    expect(next.scores).toEqual([120, 340, 0, 0]);
    expect(next.played).toEqual([true, false, false, false]);
  });

  it("drops the last groups when there are fewer", () => {
    const league: League = { ...initialLeague(3), scores: [10, 20, 30] };
    expect(reduceLeague(league, { type: "setGroups", count: 2 }, limits).scores).toEqual([10, 20]);
  });

  it("stays between 2 and 8", () => {
    const league = initialLeague(3);
    expect(reduceLeague(league, { type: "setGroups", count: 1 }, limits).scores).toHaveLength(2);
    expect(reduceLeague(league, { type: "setGroups", count: 12 }, limits).scores).toHaveLength(8);
  });

  it("returns the same league when nothing changes", () => {
    const league = initialLeague(3);
    expect(reduceLeague(league, { type: "setGroups", count: 3 }, limits)).toBe(league);
  });
});

describe("editing a score", () => {
  it("sets one group's score", () => {
    const next = reduceLeague(initialLeague(3), { type: "setScore", group: 1, score: 250 }, limits);
    expect(next.scores).toEqual([0, 250, 0]);
  });

  it("never goes below zero and rounds to whole points", () => {
    const league = initialLeague(2);
    expect(reduceLeague(league, { type: "setScore", group: 0, score: -40 }, limits).scores[0]).toBe(0);
    expect(reduceLeague(league, { type: "setScore", group: 0, score: 99.6 }, limits).scores[0]).toBe(100);
  });

  it("ignores a group that does not exist or a score that is not a number", () => {
    const league = initialLeague(2);
    expect(reduceLeague(league, { type: "setScore", group: 5, score: 10 }, limits)).toBe(league);
    expect(reduceLeague(league, { type: "setScore", group: 0, score: Number.NaN }, limits)).toBe(league);
  });
});

describe("resetting", () => {
  it("clears scores and who has played but keeps the number of groups", () => {
    const league: League = { scores: [100, 200, 300], played: [true, true, false] };
    expect(reduceLeague(league, { type: "reset" }, limits)).toEqual(initialLeague(3));
  });
});

describe("finishing a match", () => {
  it("adds points to the chosen group and marks its turn played", () => {
    const league = reduceLeague(initialLeague(2), { type: "finishMatch", group: 1, points: 300 }, limits);
    expect(league.scores).toEqual([0, 300]);
    expect(league.played).toEqual([false, true]);
  });

  it("rejects missing groups and invalid points", () => {
    const league = initialLeague(2);
    for (const action of [
      { type: "finishMatch", group: 5, points: 100 },
      { type: "finishMatch", group: 0.5, points: 100 },
      { type: "finishMatch", group: 0, points: -1 },
      { type: "finishMatch", group: 0, points: Number.NaN },
    ] as const) expect(reduceLeague(league, action, limits)).toBe(league);
  });
});
