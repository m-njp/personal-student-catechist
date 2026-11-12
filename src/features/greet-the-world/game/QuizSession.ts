import { Observable } from "@/core/Observable";
import { signsOf, type Challenge, type GreetContent } from "../content";
import type { CameraView } from "../detection/CameraLoop";
import type { League } from "./rules";

export type QuizPhase = "scoreboard" | "card" | "running" | "result" | "turnEnd" | "final" | "finalScores" | "question";
export interface Turn {
  group: number;
  score: number;
  answered: boolean;
  correct: boolean | null;
  earned: number;
}
export interface QuizState {
  phase: QuizPhase;
  turn: Turn;
  index: number;
  challenge: Challenge | null;
  remainingMs: number;
  countdown: number;
  paused: boolean;
  answer: string;
  finalReady: boolean;
}
const turn = (group: number): Turn => ({ group, score: 0, answered: false, correct: null, earned: 0 });
const initial = (): QuizState => ({ phase: "scoreboard", turn: turn(0), index: 0, challenge: null,
  remainingMs: 0, countdown: 0, paused: false, answer: "", finalReady: false });
const now = () => performance.now();

/** One group's player answers every card. Camera, keys, and buttons use the same scoring path. */
export class QuizSession extends Observable<QuizState> {
  private state = initial();
  private deadline = 0;
  private pausedAt = 0;

  constructor(private readonly content: GreetContent, private readonly getLeague: () => League,
    private readonly commit: (group: number, points: number) => void) { super(); }

  startTurn(group: number, at = now()): void {
    if (this.state.phase !== "scoreboard" || !Number.isInteger(group) || group < 0 || group >= this.getLeague().scores.length) return;
    this.update({ ...initial(), turn: turn(group) }); this.showCard(0, at);
  }

  tick(at = now()): void {
    if (["card", "running", "result", "turnEnd"].includes(this.state.phase) && this.state.turn.group >= this.getLeague().scores.length) return this.reset();
    if (this.state.paused) return;
    const left = Math.max(0, this.deadline - at);
    if (this.state.phase === "card") {
      if (!left) this.startTimer(at);
      else if (Math.ceil(left / 1000) !== this.state.countdown) this.update({ countdown: Math.ceil(left / 1000) });
    } else if (this.state.phase === "running") {
      if (!left) this.reveal(false, false, 0, at);
      else if (Math.ceil(left / 1000) !== Math.ceil(this.state.remainingMs / 1000)) this.update({ remainingMs: left });
    } else if (this.state.phase === "result" && !left) this.advance(at);
  }

  answer(answer: boolean | 0 | 1 | 2, at = now()): void {
    const card = this.state.challenge;
    if (card?.kind === "trueFalse" && typeof answer === "boolean") this.mark(answer === card.answer, at);
    if (card?.kind === "choice" && typeof answer === "number") this.mark(answer === card.answer, at);
  }

  mark(correct: boolean, at = now()): void {
    if (this.state.phase !== "running" || this.state.paused) return;
    const remaining = Math.max(0, this.deadline - at);
    this.reveal(correct && remaining > 0, remaining > 0, remaining, at);
  }

  skip(at = now()): void {
    if (this.state.paused) return;
    if (this.state.phase === "card") this.startTimer(at);
    if (this.state.phase === "running") this.reveal(false, false, 0, at);
  }

  pause(at = now()): void {
    if (!["card", "running", "result"].includes(this.state.phase)) return;
    if (this.state.paused) {
      this.deadline += Math.max(0, at - this.pausedAt); this.update({ paused: false }); return;
    }
    this.tick(at); this.pausedAt = at; this.update({ paused: true });
  }

  next(at = now()): void {
    if (this.state.paused) return;
    if (this.state.phase === "card") this.startTimer(at);
    else if (this.state.phase === "result") this.advance(at);
    else if (this.state.phase === "turnEnd") this.reset();
    else if (this.state.phase === "finalScores") this.update({ phase: "question" });
  }
  startFinal(): void { this.update({ ...initial(), phase: "final" }); }
  finishFinal(): void { if (this.state.phase === "final") this.update({ phase: "finalScores" }); }
  reset(): void { this.update(initial()); }

  observe(view: CameraView, at = now()): void {
    if (this.state.paused) return;
    const player = view.status === "running" && view.locked && view.player?.found ? view.player : null;
    if (this.state.phase === "final") {
      const finalReady = Boolean(player?.held.includes("twoOpenPalms"));
      if (finalReady !== this.state.finalReady) this.update({ finalReady });
      if (finalReady) this.finishFinal();
      return;
    }
    const card = this.state.challenge;
    if (this.state.phase !== "running" || !card || !player) return;
    if (card.kind === "pose") {
      if (player.held.includes(card.pose)) this.mark(true, at);
      return;
    }
    const signs = signsOf(card);
    const held = signs.filter(sign => player.held.includes(sign));
    if (held.length !== 1) return;
    const choice = signs.indexOf(held[0]);
    if (card.kind === "trueFalse") this.answer(choice === 0, at);
    else if (choice === 0 || choice === 1 || choice === 2) this.answer(choice, at);
  }

  protected createSnapshot(): QuizState { return this.state; }
  private duration(card: Challenge): number { return this.content.seconds[card.kind] * 1000; }
  private showCard(index: number, at: number): void {
    const challenge = this.content.questions[index];
    this.deadline = at + this.content.pace.preview * 1000;
    this.update({ phase: "card", index, challenge, countdown: this.content.pace.preview,
      remainingMs: this.duration(challenge), answer: "", turn: { ...this.state.turn, answered: false, correct: null, earned: 0 } });
  }
  private startTimer(at: number): void {
    if (!this.state.challenge) return;
    const remainingMs = this.duration(this.state.challenge);
    this.deadline = at + remainingMs; this.update({ phase: "running", remainingMs, countdown: 0 });
  }
  private advance(at: number): void {
    if (this.state.index + 1 < this.content.questions.length) return this.showCard(this.state.index + 1, at);
    const { group, score } = this.state.turn;
    this.update({ phase: "turnEnd", challenge: null }); this.commit(group, score);
  }
  private reveal(correct: boolean, answered: boolean, remainingMs: number, at: number): void {
    const card = this.state.challenge;
    if (!card) return;
    const earned = correct ? this.content.points.right + Math.round(this.content.points.speed * remainingMs / this.duration(card)) : 0;
    const answer = card.kind === "trueFalse" ? (card.answer ? this.content.answers.true : this.content.answers.false)
      : card.kind === "choice" ? card.choices[card.answer] : "";
    this.deadline = at + this.content.pace.result * 1000;
    this.update({ phase: "result", answer, turn: { ...this.state.turn, answered, correct, earned, score: this.state.turn.score + earned } });
  }
  private update(patch: Partial<QuizState>): void { this.state = { ...this.state, ...patch }; this.notify(); }
}
