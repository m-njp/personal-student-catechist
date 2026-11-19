import { Observable } from "@/core/Observable";
import { cuesFor, fiestaCues, MEMORY_COUNT, QUESTS, questX, stopX, type Cue, type QuestId, type SoundName } from "./route";

/**
 * Timing for the whole walk. Change these to make the journey longer or shorter.
 * Each stretch of road takes stopGaps[i] / walkSpeed seconds, about 4.5 to 8, plus a short pause
 * for the side quest on it. The whole journey runs about 3 to 5 minutes, depending on how long the
 * class talks over each answer.
 */
export interface Timing {
  walkSpeed: number;
  stopGaps: readonly number[];
  replayMs: number;
  answerHoldMs: number;
  slowdown: number;
  stride: number;
}

export const TIMING: Timing = {
  /** Walking speed, in road pixels per second. */
  walkSpeed: 104,
  /** Road to each memory, then to the Church, in road pixels. */
  stopGaps: [420, 560, 760, 560, 720],
  /** How long a memory replays before its question shows. */
  replayMs: 6200,
  /** How long the answer stays on screen before the walk goes on by itself. */
  answerHoldMs: 5000,
  /** The walk slows down over this much road before a stop, instead of halting at once. */
  slowdown: 36,
  /** Road between two footsteps. */
  stride: 20,
};

/**
 * title: the start screen. walk: on the road. replay: a memory plays back. ask: the question
 * waits for the class. answer: the answer shows, then the walk goes on. end: at the Church.
 */
export type Phase = "title" | "walk" | "replay" | "ask" | "answer" | "end";

export interface JourneySnapshot {
  phase: Phase;
  /** The memory being shown, or the last one passed. -1 before the first; MEMORY_COUNT at the Church. */
  memory: number;
  paused: boolean;
  muted: boolean;
}

export type JourneyEvent =
  | { type: "start" }
  | { type: "arrive"; memory: number }
  | { type: "ask"; memory: number }
  | { type: "reveal"; memory: number }
  | { type: "walk" }
  | { type: "church" }
  | { type: "cue"; sound: SoundName }
  | { type: "quest"; id: QuestId }
  | { type: "step"; foot: 0 | 1 }
  | { type: "jump" }
  | { type: "restart" }
  | { type: "mute"; muted: boolean }
  | { type: "pause"; paused: boolean };

type EventListener = (event: JourneyEvent) => void;

/** Long ago, for side quests passed by a jump: they show as already done. */
const LONG_AGO = -1e9;

/**
 * The rules of A Journey to Remember, with no drawing and no React. The pupil walks to each memory,
 * stopping for small side quests on the way, the memory replays, the question waits for the
 * presenter, and the answer leads the walk on. React hears about phase changes only; the renderer
 * reads `x`, `phaseMs`, `clock`, and `questAge` every frame.
 */
export class Journey extends Observable<JourneySnapshot> {
  /** The pupil's place on the road. */
  x = 0;
  /** Time spent in the current phase. */
  phaseMs = 0;
  /** Time that has run while not paused, for things that move on their own. */
  clock = 0;

  private phase: Phase = "title";
  private memory = -1;
  private paused = false;
  private muted = false;
  private holdMs = 0;
  private readonly questStarted = new Map<QuestId, number>();
  private readonly eventListeners = new Set<EventListener>();

  constructor(readonly timing: Timing = TIMING) {
    super();
  }

  on(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  get current(): Phase {
    return this.phase;
  }

  get memoryIndex(): number {
    return this.memory;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** True while the walk waits for a side quest to play. */
  get holding(): boolean {
    return this.holdMs > 0;
  }

  /** Milliseconds since a side quest began, or null if the pupil has not reached it. */
  questAge(id: QuestId): number | null {
    const started = this.questStarted.get(id);
    return started === undefined ? null : this.clock - started;
  }

  /** Where the walk stops next: a memory, or the Church after the last one. */
  get target(): number {
    return stopX(Math.min(this.memory + 1, MEMORY_COUNT), this.timing);
  }

  /** Space, Enter, or a click: start, skip a replay, reveal the answer, or walk on. */
  advance(): void {
    if (this.paused) {
      this.togglePause();
      return;
    }
    switch (this.phase) {
      case "title":
        this.setPhase("walk");
        this.emit({ type: "start" });
        break;
      case "replay":
        this.setPhase("ask");
        this.emit({ type: "ask", memory: this.memory });
        break;
      case "ask":
        this.setPhase("answer");
        this.emit({ type: "reveal", memory: this.memory });
        break;
      case "answer":
        this.walkOn();
        break;
      default:
        break;
    }
  }

  /** Jumps to a memory (0 to 3) or to the Church (MEMORY_COUNT). */
  jump(stop: number): void {
    const to = Math.max(0, Math.min(MEMORY_COUNT, Math.round(stop)));
    this.paused = false;
    this.holdMs = 0;
    this.x = stopX(to, this.timing);
    this.memory = to;
    this.questStarted.clear();
    for (const quest of QUESTS) {
      if (questX(quest, this.timing) < this.x) this.questStarted.set(quest.id, LONG_AGO);
    }
    this.emit({ type: "jump" });
    if (to === MEMORY_COUNT) {
      this.setPhase("end");
      this.emit({ type: "church" });
    } else {
      this.setPhase("replay");
      this.emit({ type: "arrive", memory: to });
    }
  }

  restart(): void {
    this.x = 0;
    this.memory = -1;
    this.paused = false;
    this.holdMs = 0;
    this.questStarted.clear();
    this.setPhase("title");
    this.emit({ type: "restart" });
  }

  togglePause(): void {
    if (this.phase === "title") return;
    this.paused = !this.paused;
    this.notify();
    this.emit({ type: "pause", paused: this.paused });
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.notify();
    this.emit({ type: "mute", muted: this.muted });
  }

  /** Moves time forward. Called every frame with the milliseconds since the last one. */
  tick(dt: number): void {
    if (this.paused || dt <= 0) return;
    this.clock += dt;
    const before = this.phaseMs;
    this.phaseMs += dt;
    switch (this.phase) {
      case "walk":
        this.walk(dt);
        break;
      case "replay":
        this.playCues(before);
        if (this.phaseMs >= this.timing.replayMs) {
          this.setPhase("ask");
          this.emit({ type: "ask", memory: this.memory });
        }
        break;
      case "answer":
        if (this.phaseMs >= this.timing.answerHoldMs) this.walkOn();
        break;
      case "end":
        for (const cue of fiestaCues()) {
          if (cue.ms >= before && cue.ms < this.phaseMs) this.emit({ type: "cue", sound: cue.sound });
        }
        break;
      default:
        break;
    }
  }

  protected createSnapshot(): JourneySnapshot {
    return { phase: this.phase, memory: this.memory, paused: this.paused, muted: this.muted };
  }

  private walk(dt: number) {
    if (this.holdMs > 0) {
      this.holdMs = Math.max(0, this.holdMs - dt);
      return;
    }
    const target = this.target;
    // The nearest side quest still ahead on this stretch, if any.
    const quest = QUESTS.filter((q) => !this.questStarted.has(q.id) && questX(q, this.timing) <= target).sort(
      (a, b) => questX(a, this.timing) - questX(b, this.timing),
    )[0];
    const stopAt = quest ? Math.min(target, questX(quest, this.timing)) : target;
    const left = stopAt - this.x;
    const ease = Math.min(1, Math.max(0.3, left / this.timing.slowdown));
    const from = this.x;
    this.x = Math.min(stopAt, this.x + (this.timing.walkSpeed * ease * dt) / 1000);
    const stride = this.timing.stride;
    if (Math.floor(this.x / stride) !== Math.floor(from / stride)) {
      this.emit({ type: "step", foot: Math.floor(this.x / stride) % 2 === 0 ? 0 : 1 });
    }
    if (this.x < stopAt) return;
    if (quest && stopAt < target) {
      this.questStarted.set(quest.id, this.clock);
      this.holdMs = quest.holdMs;
      this.emit({ type: "quest", id: quest.id });
      return;
    }
    this.memory = Math.min(this.memory + 1, MEMORY_COUNT);
    if (this.memory === MEMORY_COUNT) {
      this.setPhase("end");
      this.emit({ type: "church" });
    } else {
      this.setPhase("replay");
      this.emit({ type: "arrive", memory: this.memory });
    }
  }

  private walkOn() {
    this.setPhase("walk");
    this.emit({ type: "walk" });
  }

  private playCues(before: number) {
    const from = before / this.timing.replayMs;
    const to = this.phaseMs / this.timing.replayMs;
    for (const cue of cuesFor(this.memory) as readonly Cue[]) {
      if (cue.at >= from && cue.at < to) this.emit({ type: "cue", sound: cue.sound });
    }
  }

  private setPhase(phase: Phase) {
    this.phase = phase;
    this.phaseMs = 0;
    this.notify();
  }

  private emit(event: JourneyEvent) {
    for (const listener of this.eventListeners) listener(event);
  }
}
