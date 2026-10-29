import type { Thresholds } from "./config";

export interface Steady {
  shown: number;
  on: boolean;
  at: number;
  candidateAt: number;
  candidate: boolean;
}

/** Hysteresis and elapsed confirmation time tolerate jitter without depending on FPS. */
export function smooth(previous: Steady | undefined, level: number, t: Thresholds, at: number): Steady {
  const wasOn = previous?.on ?? false;
  const candidate = level >= (wasOn ? 1 - t.hysteresis : 1);
  const candidateAt = previous?.candidate === candidate ? previous.candidateAt : at;
  const on = candidate === wasOn || at - candidateAt >= t.settleMs ? candidate : wasOn;
  const elapsed = previous ? Math.max(0, at - previous.at) : 0;
  const ease = 1 - Math.exp(-elapsed / t.smoothMs);
  const shown = previous ? previous.shown + ease * (Math.min(1, Math.max(0, level)) - previous.shown) : Math.min(1, Math.max(0, level));
  return { shown, on, at, candidateAt, candidate };
}

export const heldSince = (since: number | null, on: boolean, now: number) => on ? (since ?? now) : null;
