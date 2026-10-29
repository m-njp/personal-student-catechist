import { Observable } from "@/core/Observable";
import type { Reading } from "../content";

export type PlayerColor = "blue" | "orange";

/** Something the detector decided, such as finding the players or a reading turning on. */
export interface LogEvent {
  /** Counts up from 1, so each event has its own name. */
  n: number;
  /** Milliseconds since the game opened. */
  at: number;
  what: "camera" | "models" | "locked" | "lost" | "on" | "off" | "held";
  player?: PlayerColor;
  reading?: Reading;
  /** The raw level when it happened, or a short note such as the GPU or CPU. */
  detail?: string;
}

/** Every level the detector read in one frame, for tuning the thresholds afterwards. */
export interface LogFrame {
  /** Milliseconds since the game opened. */
  at: number;
  levels: readonly (Readonly<Record<string, number>> | null)[];
  fps?: number;
  inferenceMs?: number;
  resultAgeMs?: number;
  delegate?: string;
  targets?: readonly Reading[];
  raw?: readonly ({
    levels: Readonly<Record<string, number>>;
    shapes: Readonly<Record<string, number>> | null;
    baseline: Readonly<Record<string, number>> | null;
    gesture: { name: string; score: number } | null;
  } | null)[];
}

/**
 * The last couple of minutes of what the detector saw and decided, kept in memory on this laptop only.
 * The teacher can read the events on screen, or download everything as JSON to tune the thresholds.
 */
export class DetectionLog extends Observable<readonly LogEvent[]> {
  private events: LogEvent[] = [];
  private frames: LogFrame[] = [];
  private count = 0;
  private readonly opened = performance.now();

  constructor(private readonly limit = 2000) {
    super();
  }

  private now(): number {
    return Math.round(performance.now() - this.opened);
  }

  event(event: Omit<LogEvent, "n" | "at">): void {
    this.events = [...this.events, { n: ++this.count, at: this.now(), ...event }].slice(-this.limit);
    this.notify();
  }

  /** Called every frame, so it does not tell React. */
  frame(levels: LogFrame["levels"], details: Omit<LogFrame, "at" | "levels"> = {}): void {
    this.frames.push({ at: this.now(), levels, ...details });
    if (this.frames.length > this.limit) this.frames.splice(0, this.frames.length - this.limit);
  }

  /** Everything, as one JSON document. Numbers only: no picture of anyone is ever kept. */
  export(thresholds: object): string {
    return JSON.stringify({ thresholds, events: this.events, frames: this.frames });
  }

  download(thresholds: object): void {
    const url = URL.createObjectURL(new Blob([this.export(thresholds)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `greet-log-${Date.now()}.json` }).click();
    URL.revokeObjectURL(url);
  }

  protected createSnapshot(): readonly LogEvent[] {
    return this.events;
  }
}
