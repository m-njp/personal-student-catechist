import { Observable } from "@/core/Observable";
import { signsOf, type Challenge, type GreetContent } from "../content";
import type { CameraView } from "../detection/CameraLoop";
import type { League } from "./rules";

/**
 * scoreboard: picking two groups. card: the question shows with a 3, 2, 1. running: the timer is on.
 * result: the answer shows for a moment. matchEnd: both groups' points. Then the final round for everyone.
 */
export type QuizPhase = "scoreboard" | "card" | "running" | "result" | "matchEnd" | "final" | "finalScores" | "question";

/** Player 1 stands on the left of the mirrored camera, Player 2 on the right. */
export type Player = 0 | 1;

/** One group's side of a match: one player at the camera, answering for their group. */
export interface Side {
  group: number;
  /** Points this match. */
  score: number;
  /** Answered this card. Their answer stays hidden until both have answered or time runs out. */
  answered: boolean;
  correct: boolean | null;
  /** Points from the last card, for the result. */
  earned: number;
}

export interface QuizState {
  phase: QuizPhase;
  sides: readonly [Side, Side];
  index: number;
  challenge: Challenge | null;
  remainingMs: number;
  /** 3, 2, 1 while a card shows before its timer starts. */
  countdown: number;
  paused: boolean;
  /** The right answer, shown with the result. */
  answer: string;
  /** Fixed player slots; a missing player never reduces the finale requirement. */
  finalPlayers: readonly [boolean, boolean];
}

interface Answer {
  correct: boolean;
  remainingMs: number;
  /** False when time ran out or the card was skipped before this side answered. */
  given: boolean;
}

const missed: Answer = { correct: false, remainingMs: 0, given: false };
const side = (group: number): Side => ({ group, score: 0, answered: false, correct: null, earned: 0 });

const initial = (): QuizState => ({
  phase: "scoreboard",
  sides: [side(0), side(1)],
  index: 0,
  challenge: null,
  remainingMs: 0,
  countdown: 0,
  paused: false,
  answer: "",
  finalPlayers: [false, false],
});

const now = () => performance.now();

/**
 * A match between two groups, one player each, through every question in order. It runs by itself: each
 * card shows with a 3, 2, 1, its timer starts, and the result shows before the next card. The camera,
 * the keys, and the teacher's buttons all answer through the same methods, so they score the same way.
 */
export class QuizSession extends Observable<QuizState> {
  private state = initial();
  private deadline = 0;
  private pausedAt = 0;
  private pending: [Answer | null, Answer | null] = [null, null];

  constructor(
    private readonly content: GreetContent,
    private readonly getLeague: () => League,
    private readonly commit: (group: number, points: number) => void,
  ) {
    super();
  }

  pickMatch(blue: number, orange: number, at = now()): void {
    const count = this.getLeague().scores.length;
    const valid = (group: number) => Number.isInteger(group) && group >= 0 && group < count;
    if (this.state.phase !== "scoreboard" || blue === orange || !valid(blue) || !valid(orange)) return;
    this.update({ ...initial(), sides: [side(blue), side(orange)] });
    this.showCard(0, at);
  }

  tick(at = now()): void {
    const count = this.getLeague().scores.length;
    // The teacher removed a group that is playing.
    if (this.state.phase !== "scoreboard" && this.state.sides.some((each) => each.group >= count)) return this.reset();
    if (this.state.paused) return;
    const left = Math.max(0, this.deadline - at);
    if (this.state.phase === "card") {
      if (!left) this.startTimer(at);
      else if (Math.ceil(left / 1000) !== this.state.countdown) this.update({ countdown: Math.ceil(left / 1000) });
    } else if (this.state.phase === "running") {
      if (!left) this.closePending(at);
      else if (Math.ceil(left / 1000) !== Math.ceil(this.state.remainingMs / 1000)) this.update({ remainingMs: left });
    } else if (this.state.phase === "result" && !left) {
      this.advance(at);
    }
  }

  answer(answer: boolean | 0 | 1 | 2, player: Player = 0, at = now()): void {
    const card = this.state.challenge;
    if (card?.kind === "trueFalse" && typeof answer === "boolean") this.resolve(answer === card.answer, player, at);
    if (card?.kind === "choice" && typeof answer === "number") this.resolve(answer === card.answer, player, at);
  }

  /** The teacher's call: done or missed, for any card. */
  mark(done: boolean, player: Player = 0, at = now()): void {
    this.resolve(done, player, at);
  }

  /** Ends the card now and shows its answer. */
  skip(at = now()): void {
    if (this.state.paused) return;
    if (this.state.phase === "card") this.startTimer(at);
    if (this.state.phase === "running") this.closePending(at);
  }

  pause(at = now()): void {
    if (this.state.phase !== "card" && this.state.phase !== "running" && this.state.phase !== "result") return;
    if (this.state.paused) {
      this.deadline += Math.max(0, at - this.pausedAt);
      this.update({ paused: false });
      return;
    }
    // The deadline may have passed since the last tick.
    this.tick(at);
    this.pausedAt = at;
    this.update({ paused: true });
  }

  /** The teacher moves on without waiting: start the timer, show the next card, or leave a finished screen. */
  next(at = now()): void {
    if (this.state.paused) return;
    if (this.state.phase === "card") this.startTimer(at);
    else if (this.state.phase === "result") this.advance(at);
    else if (this.state.phase === "matchEnd") this.reset();
    else if (this.state.phase === "finalScores") this.update({ phase: "question" });
  }

  startFinal(): void {
    this.update({ ...initial(), phase: "final" });
  }

  finishFinal(): void {
    if (this.state.phase === "final") this.update({ phase: "finalScores" });
  }

  reset(): void {
    this.pending = [null, null];
    this.update(initial());
  }

  /** Reads the camera: each player answers for their own side, Player 1 on the left. */
  observe(view: CameraView, at = now()): void {
    if (this.state.paused || view.status !== "running") return;
    if (this.state.phase === "final") return this.observeFinal(view);
    const card = this.state.challenge;
    if (this.state.phase !== "running" || !card || !view.locked) return;
    const signs = signsOf(card);
    view.players.slice(0, 2).forEach((player, i) => {
      if (!player.found) return;
      const index = i as Player;
      if (card.kind === "pose") {
        if (player.held.includes(card.pose)) this.resolve(true, index, at);
        return;
      }
      // One answer sign held, not two at once, counts.
      const held = signs.filter((sign) => player.held.includes(sign));
      if (held.length !== 1) return;
      const choice = signs.indexOf(held[0]);
      if (card.kind === "trueFalse") this.answer(choice === 0, index, at);
      else if (choice === 0 || choice === 1 || choice === 2) this.answer(choice, index, at);
    });
  }

  protected createSnapshot(): QuizState {
    return this.state;
  }

  private observeFinal(view: CameraView): void {
    const ready = (i: number) => view.locked && view.players[i]?.found === true && view.players[i].held.includes("twoOpenPalms");
    const finalPlayers: [boolean, boolean] = [ready(0), ready(1)];
    if (finalPlayers.some((value, i) => value !== this.state.finalPlayers[i])) this.update({ finalPlayers });
    if (finalPlayers.every(Boolean)) this.finishFinal();
  }

  private duration(card: Challenge): number {
    return this.content.seconds[card.kind] * 1000;
  }

  private showCard(index: number, at: number): void {
    const challenge = this.content.questions[index];
    this.pending = [null, null];
    this.deadline = at + this.content.pace.preview * 1000;
    const [blue, orange] = this.state.sides;
    const fresh = (each: Side): Side => ({ ...each, answered: false, correct: null, earned: 0 });
    this.update({
      phase: "card",
      index,
      challenge,
      countdown: this.content.pace.preview,
      remainingMs: this.duration(challenge),
      answer: "",
      sides: [fresh(blue), fresh(orange)],
    });
  }

  private startTimer(at: number): void {
    if (!this.state.challenge) return;
    const remainingMs = this.duration(this.state.challenge);
    this.deadline = at + remainingMs;
    this.update({ phase: "running", remainingMs, countdown: 0 });
  }

  /** The next card, or the end of the match, where both groups' points are saved. */
  private advance(at: number): void {
    if (this.state.index + 1 < this.content.questions.length) return this.showCard(this.state.index + 1, at);
    for (const each of this.state.sides) this.commit(each.group, each.score);
    this.update({ phase: "matchEnd", challenge: null });
  }

  private resolve(correct: boolean, player: Player, at: number): void {
    if (this.state.phase !== "running" || this.state.paused || this.pending[player]) return;
    const remainingMs = Math.max(0, this.deadline - at);
    // A late camera or teacher answer cannot beat the deadline.
    this.pending[player] = { correct: correct && remainingMs > 0, remainingMs, given: true };
    if (this.pending.every(Boolean)) return this.reveal(at);
    const [blue, orange] = this.state.sides;
    this.update({ sides: [{ ...blue, answered: this.pending[0] !== null }, { ...orange, answered: this.pending[1] !== null }] });
  }

  private closePending(at: number): void {
    this.pending = [this.pending[0] ?? missed, this.pending[1] ?? missed];
    this.reveal(at);
  }

  /** Scores both sides: the right answer, and more for a faster one. */
  private reveal(at: number): void {
    const card = this.state.challenge;
    if (!card) return;
    const { right, speed } = this.content.points;
    const score = (each: Side, answer: Answer | null): Side => {
      const correct = answer?.correct === true;
      const earned = correct ? right + Math.round((speed * (answer?.remainingMs ?? 0)) / this.duration(card)) : 0;
      return { ...each, answered: answer?.given === true, correct, earned, score: each.score + earned };
    };
    const [blue, orange] = this.state.sides;
    const answer =
      card.kind === "trueFalse" ? (card.answer ? this.content.answers.true : this.content.answers.false) : card.kind === "choice" ? card.choices[card.answer] : "";
    this.deadline = at + this.content.pace.result * 1000;
    this.update({ phase: "result", sides: [score(blue, this.pending[0]), score(orange, this.pending[1])], answer });
  }

  private update(patch: Partial<QuizState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }
}
