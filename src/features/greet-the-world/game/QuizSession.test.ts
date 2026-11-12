import { describe, expect, it, vi } from "vitest";
import { greet } from "@/content/lessons/lesson-04/greet";
import { signsOf, type Reading } from "../content";
import type { CameraView } from "../detection/CameraLoop";
import { QuizSession } from "./QuizSession";
import { initialLeague } from "./rules";
const PREVIEW = greet.pace.preview * 1000, RESULT = greet.pace.result * 1000;
const camera = (held: readonly Reading[], found = true): CameraView => ({ status: "running", error: null,
  aspect: 16 / 9, locked: true, detected: 1, player: { found, face: true, on: held, held }, guidance: null, light: "ok", passed: [] });
function turn(group = 0) {
  const commit = vi.fn(); const session = new QuizSession(greet, () => initialLeague(3), commit);
  session.startTurn(group, 0); return { session, commit, state: () => session.getSnapshot() };
}
describe("one group's quiz turn", () => {
  it("counts down and starts the timer automatically", () => {
    const { session, state } = turn(); expect(state()).toMatchObject({ phase: "card", countdown: 3 });
    session.tick(1500); expect(state().countdown).toBe(2);
    session.tick(PREVIEW); expect(state()).toMatchObject({ phase: "running", remainingMs: 8000 });
  });
  it("reveals immediately after one answer and advances automatically", () => {
    const { session, state } = turn(); session.tick(PREVIEW); session.answer(false, PREVIEW + 1000);
    expect(state()).toMatchObject({ phase: "result", turn: { correct: true, answered: true } });
    session.tick(PREVIEW + 1000 + RESULT); expect(state()).toMatchObject({ phase: "card", index: 1 });
  });
  it("plays all cards and saves only the selected group's points exactly once", () => {
    const { session, state, commit } = turn(2); let at = 0;
    for (const card of greet.questions) {
      expect(state().challenge).toBe(card); at += PREVIEW; session.tick(at); session.mark(true, at);
      at += RESULT; session.tick(at);
    }
    expect(state().phase).toBe("turnEnd");
    expect(commit.mock.calls).toEqual([[2, greet.questions.length * (greet.points.right + greet.points.speed)]]);
    session.tick(at + 10000); session.next(at + 10000); expect(commit).toHaveBeenCalledTimes(1);
    expect(state().phase).toBe("scoreboard");
  });
  it("rejects invalid groups and resets if the active group is removed", () => {
    let count = 3; const session = new QuizSession(greet, () => initialLeague(count), vi.fn());
    for (const group of [-1, 0.5, 3, NaN]) session.startTurn(group);
    expect(session.getSnapshot().phase).toBe("scoreboard");
    session.startTurn(2, 0); count = 2; session.tick(100); expect(session.getSnapshot().phase).toBe("scoreboard");
  });
});
describe("scoring and teacher fallback", () => {
  it("keeps speed scoring and rejects repeated or late answers", () => {
    const { session, state } = turn(); session.tick(PREVIEW); session.answer(false, PREVIEW + 4000);
    expect(state().turn.earned).toBe(150); session.mark(true, PREVIEW + 4001); expect(state().turn.score).toBe(150);
    const late = turn(); late.session.tick(PREVIEW); late.session.answer(false, PREVIEW + 8000);
    expect(late.state().turn).toMatchObject({ correct: false, earned: 0, answered: false });
  });
  it("times out and skips without waiting for a second player", () => {
    const { session, state } = turn(); session.tick(PREVIEW); session.tick(PREVIEW + 8000);
    expect(state()).toMatchObject({ phase: "result", turn: { correct: false, answered: false } });
    session.next(PREVIEW + 8000); session.skip(PREVIEW + 8100); expect(state().phase).toBe("result");
  });
  it("freezes the clock while paused and refuses answers", () => {
    const { session, state } = turn(); session.tick(PREVIEW); session.pause(PREVIEW);
    session.answer(false, PREVIEW + 1000); session.tick(PREVIEW + 20000); expect(state().turn.answered).toBe(false);
    session.pause(PREVIEW + 20000); session.answer(false, PREVIEW + 20000); expect(state().turn.earned).toBe(200);
  });
  it("awards nothing for a wrong manual answer", () => {
    const { session, state } = turn(); session.tick(PREVIEW); session.answer(true, PREVIEW);
    expect(state().turn).toMatchObject({ correct: false, earned: 0 });
  });
});
describe("one camera player", () => {
  it("answers with the card's own sign and ignores conflicting or irrelevant signs", () => {
    const { session, state } = turn(); session.tick(PREVIEW);
    session.observe(camera(signsOf(greet.questions[0])), PREVIEW + 100); expect(state().phase).toBe("running");
    session.observe(camera(["happy"]), PREVIEW + 200); expect(state().phase).toBe("running");
    session.observe(camera([signsOf(greet.questions[0])[1]]), PREVIEW + 1000);
    expect(state()).toMatchObject({ phase: "result", turn: { correct: true } });
  });
  it("ignores missing, unlocked and failed camera observations", () => {
    const { session, state } = turn(); session.tick(PREVIEW);
    const view = camera([signsOf(greet.questions[0])[1]]);
    for (const patch of [{ player: null }, { locked: false }, { status: "error" as const }, { player: { ...view.player!, found: false } }]) {
      session.observe({ ...view, ...patch }, PREVIEW + 1000);
    }
    expect(state().phase).toBe("running");
    session.answer(false, PREVIEW + 1000); expect(state().phase).toBe("result");
  });
  it("reads face signs and poses on their cards", () => {
    const { session, state } = turn(); let at = 0;
    const target = greet.questions.findIndex(card => card.kind === "trueFalse" && signsOf(card).includes("happy"));
    for (let index = 0; index < target; index++) { session.skip(at); session.next(at); }
    at = PREVIEW; session.tick(at); session.observe(camera(["happy"]), at + 1000);
    expect(state().turn.correct).toBe(true);
    const pose = new QuizSession({ ...greet, questions: [{ kind: "pose", id: "pose", text: "Pray", pose: "praying" }] }, () => initialLeague(2), vi.fn());
    pose.startTurn(0, 0); pose.tick(PREVIEW); pose.observe(camera(["praying"]), PREVIEW + 1000);
    expect(pose.getSnapshot().turn.correct).toBe(true);
  });
  it("finishes the finale with two palms from one present player", () => {
    const { session, state } = turn(); session.startFinal();
    session.observe(camera(["openPalm"])); expect(state().phase).toBe("final");
    session.observe(camera(["twoOpenPalms"], false)); expect(state().phase).toBe("final");
    session.observe(camera(["twoOpenPalms"])); expect(state()).toMatchObject({ phase: "finalScores", finalReady: true });
    session.next(); expect(state().phase).toBe("question");
  });
});
