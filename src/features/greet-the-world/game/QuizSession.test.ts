import { describe, expect, it, vi } from "vitest";
import { greet } from "@/content/lessons/lesson-04/greet";
import { signsOf, type Reading } from "../content";
import type { CameraView, PlayerView } from "../detection/CameraLoop";
import { QuizSession } from "./QuizSession";
import { initialLeague } from "./rules";

const PREVIEW = greet.pace.preview * 1000;
const RESULT = greet.pace.result * 1000;
const player = (held: readonly Reading[], found = true): PlayerView => ({ found, face: true, on: held, held });
const camera = (players: readonly PlayerView[]): CameraView => ({
  status: "running",
  error: null,
  aspect: 16 / 9,
  locked: true,
  detected: players.length,
  players,
  light: "ok",
  passed: [],
});

/** Group 1 against Group 2, picked at 0 ms, so the first timer starts at PREVIEW. */
function match(groups = 2) {
  const commit = vi.fn();
  const session = new QuizSession(greet, () => initialLeague(groups), commit);
  session.pickMatch(0, 1, 0);
  return { session, commit, state: () => session.getSnapshot() };
}

describe("a match runs by itself", () => {
  it("shows each card with a 3, 2, 1, then starts its timer without a click", () => {
    const { session, state } = match();
    expect(state()).toMatchObject({ phase: "card", index: 0, countdown: 3, challenge: greet.questions[0] });
    session.tick(1500);
    expect(state().countdown).toBe(2);
    session.tick(PREVIEW);
    expect(state()).toMatchObject({ phase: "running", remainingMs: greet.seconds.trueFalse * 1000 });
  });

  it("shows the result, then moves to the next card on its own", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    session.tick(PREVIEW + greet.seconds.trueFalse * 1000);
    expect(state().phase).toBe("result");
    session.tick(PREVIEW + greet.seconds.trueFalse * 1000 + RESULT);
    expect(state()).toMatchObject({ phase: "card", index: 1, challenge: greet.questions[1] });
  });

  it("plays every question in order, then saves both groups' points once", () => {
    const { session, commit, state } = match();
    let at = 0;
    for (const question of greet.questions) {
      expect(state().challenge).toBe(question);
      at += PREVIEW;
      session.tick(at);
      session.mark(true, 0, at);
      session.mark(false, 1, at);
      at += RESULT;
      session.tick(at);
    }
    expect(state().phase).toBe("matchEnd");
    expect(commit).toHaveBeenCalledTimes(2);
    expect(commit.mock.calls[1]).toEqual([1, 0]);
    session.next();
    expect(state().phase).toBe("scoreboard");
  });

  it("refuses a group against itself or a group that does not exist", () => {
    const session = new QuizSession(greet, () => initialLeague(2), vi.fn());
    session.pickMatch(0, 0);
    session.pickMatch(0, 5);
    expect(session.getSnapshot().phase).toBe("scoreboard");
  });

  it("drops the match if the teacher removes a group that is playing", () => {
    let count = 3;
    const session = new QuizSession(greet, () => initialLeague(count), vi.fn());
    session.pickMatch(0, 2, 0);
    count = 2;
    session.tick(100);
    expect(session.getSnapshot().phase).toBe("scoreboard");
  });
});

describe("scoring", () => {
  it("gives more for a faster right answer, and nothing for a wrong one", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    // Question 1's answer is false. Blue answers with the whole time left, Orange halfway, wrongly.
    session.answer(false, 0, PREVIEW);
    session.answer(true, 1, PREVIEW + 4000);
    expect(state()).toMatchObject({
      phase: "result",
      sides: [
        { correct: true, earned: greet.points.right + greet.points.speed },
        { correct: false, earned: 0 },
      ],
    });
  });

  it("hides each side's answer until both have answered, and misses a side that runs out of time", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    session.answer(false, 0, PREVIEW + 4000);
    expect(state()).toMatchObject({ phase: "running", sides: [{ answered: true, correct: null }, { answered: false }] });
    session.tick(PREVIEW + 8000);
    expect(state()).toMatchObject({
      phase: "result",
      sides: [{ correct: true, earned: greet.points.right + greet.points.speed / 2 }, { correct: false, answered: false }],
    });
  });

  it("freezes the clock while paused and refuses answers then", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    session.pause(PREVIEW);
    session.answer(false, 0, PREVIEW + 1000);
    expect(state().sides[0].answered).toBe(false);
    session.tick(PREVIEW + 20000);
    expect(state().phase).toBe("running");
    session.pause(PREVIEW + 20000);
    session.answer(false, 0, PREVIEW + 20000);
    session.mark(false, 1, PREVIEW + 20000);
    expect(state().sides[0].earned).toBe(greet.points.right + greet.points.speed);
  });
});

describe("the camera", () => {
  it("lets each player answer for their own group with the card's own signs", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    const [, falseSign] = signsOf(greet.questions[0]);
    session.observe(camera([player([falseSign]), player([], false)]), PREVIEW + 1000);
    expect(state().sides.map((each) => each.answered)).toEqual([true, false]);
    session.observe(camera([player([falseSign]), player([signsOf(greet.questions[0])[0]])]), PREVIEW + 2000);
    expect(state()).toMatchObject({ phase: "result", sides: [{ correct: true }, { correct: false }] });
  });

  it("reads a smile or a surprised face where a question asks for them", () => {
    const index = greet.questions.findIndex((question) => question.kind === "trueFalse" && question.signs?.includes("happy"));
    const [trueSign] = signsOf(greet.questions[index]);
    const { session, state } = match();
    let at = 0;
    for (let i = 0; i < index; i++) {
      at += PREVIEW;
      session.tick(at);
      session.skip(at);
      at += RESULT;
      session.tick(at);
    }
    session.tick(at + PREVIEW);
    // Group 1 holds a sign that is not on the card. Group 2 holds the card's own face sign.
    session.observe(camera([player(["fist"]), player([trueSign])]), at + PREVIEW + 100);
    expect(state().sides.map((each) => each.answered)).toEqual([false, true]);
  });

  it("ignores a player holding two answers at once", () => {
    const { session, state } = match();
    session.tick(PREVIEW);
    session.observe(camera([player(signsOf(greet.questions[0])), player([])]), PREVIEW + 1000);
    expect(state().sides[0].answered).toBe(false);
  });

  it("requires both fixed players to hold two palms at the same time", () => {
    const session = new QuizSession(greet, () => initialLeague(2), vi.fn());
    session.startFinal();
    session.observe(camera([player(["twoOpenPalms"])]));
    expect(session.getSnapshot().phase).toBe("final");
    expect(session.getSnapshot().finalPlayers).toEqual([true, false]);
    session.observe(camera([player([], false), player(["twoOpenPalms"])]));
    expect(session.getSnapshot().finalPlayers).toEqual([false, true]);
    session.observe(camera([player(["openPalm"]), player(["openPalm"])]));
    expect(session.getSnapshot().phase).toBe("final");
    session.observe(camera([player(["twoOpenPalms"]), player(["twoOpenPalms"])]));
    expect(session.getSnapshot().phase).toBe("finalScores");
    session.next();
    expect(session.getSnapshot().phase).toBe("question");
  });
});
