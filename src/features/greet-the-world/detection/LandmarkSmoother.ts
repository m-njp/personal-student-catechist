import type { Landmarks } from "./geometry";

/** Presentation only. Missing landmarks are never extrapolated. */
export class LandmarkSmoother {
  private previous = new Map<string, { points: Landmarks; at: number }>();
  constructor(private readonly easeMs: number, private readonly staleMs: number) {}
  clear(): void { this.previous.clear(); }
  retain(keys: ReadonlySet<string>): void {
    for (const key of this.previous.keys()) if (!keys.has(key)) this.previous.delete(key);
  }
  read(key: string, points: Landmarks, at: number, visibility: number): Landmarks {
    const old = this.previous.get(key);
    const fresh = !old || at - old.at > this.staleMs;
    const ease = fresh ? 1 : 1 - Math.exp(-Math.max(0, at - old.at) / this.easeMs);
    const next = points.map((point, i) => {
      const before = old?.points[i];
      if (!before || before.visibility < visibility || point.visibility < visibility) return point;
      return { ...point, x: before.x + ease * (point.x - before.x), y: before.y + ease * (point.y - before.y) };
    });
    this.previous.set(key, { points: next, at });
    return next;
  }
}
