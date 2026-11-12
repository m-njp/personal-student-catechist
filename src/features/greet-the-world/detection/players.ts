import type { Thresholds } from "./config";
import { tracking } from "./config";
import { distance, middle, POSE, type Landmarks, type Point } from "./geometry";

export interface Spot { center: Point; width: number }
export interface Body extends Spot { pose: Landmarks; appearance?: readonly number[] | null }
export type Guidance = "center" | "return" | "left" | "right" | "closer" | "back" | "up" | "down" | "hold";

/** Detecting several people lets us reject bystanders; only one can become the player. */
export function bodies(poses: readonly Landmarks[], t: Thresholds): Body[] {
  return poses.flatMap(pose => {
    const left = pose[POSE.leftShoulder], right = pose[POSE.rightShoulder];
    if (!left || !right || left.visibility < t.visibility || right.visibility < t.visibility) return [];
    const width = distance(left, right);
    return width >= t.playerSize ? [{ pose, center: middle(left, right), width }] : [];
  });
}

function appearanceGap(a: readonly number[] | null | undefined, b: readonly number[] | null | undefined): number | null {
  if (!a || !b || a.length !== b.length) return null;
  return a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / 2;
}

/** The clothes seen at acquisition stay fixed, so a recovery cannot drift from the player to a bystander. */
export class SubjectTracker {
  spot: Spot | null = null;
  guidance: Guidance = "center";
  private identity: readonly number[] | null = null;
  private missing = false;
  private candidate: Body | null = null;
  private since = 0;

  reset(): void {
    this.spot = null; this.identity = null; this.missing = false; this.candidate = null; this.guidance = "center";
  }

  lose(): void {
    this.missing = Boolean(this.spot); this.candidate = null;
    this.guidance = this.spot ? "return" : "center";
  }

  observe(found: readonly Body[], aspect: number, now: number): Body | null {
    if (!this.spot) {
      const candidates = found.filter(body => Math.abs(body.center.x / aspect - 0.5) <= tracking.centerRange)
        .map(body => ({ body, score: Math.abs(body.center.x - aspect / 2) / body.width }))
        .sort((a, b) => a.score - b.score);
      const best = candidates[0];
      if (!best || (candidates[1] && candidates[1].score - best.score < tracking.subjectAmbiguity)) {
        this.candidate = null; this.guidance = "center"; return null;
      }
      this.guidance = "hold";
      if (!this.confirm(best.body, now)) return null;
      this.spot = best.body; this.identity = best.body.appearance ?? null; this.candidate = null;
      return best.body;
    }
    const spot = this.spot;
    const candidates = found.flatMap(body => {
      const gap = distance(spot.center, body.center) / spot.width;
      const scale = body.width / spot.width;
      // Frame to frame, position and size are proof enough. After a loss, only the same clothes are.
      const appearance = this.missing ? appearanceGap(this.identity, body.appearance) : 0;
      if (gap > tracking.followMove || scale < tracking.followWidth || scale > 1 / tracking.followWidth ||
          appearance === null || appearance > tracking.appearanceGap) return [];
      return [{ body, score: gap + Math.abs(Math.log(scale)) + appearance }];
    }).sort((a, b) => a.score - b.score);
    const best = candidates[0];
    if (!best || (candidates[1] && candidates[1].score - best.score < tracking.subjectAmbiguity)) {
      this.lose(); this.guide(found); return null;
    }
    if (this.missing) {
      this.guidance = "hold";
      if (!this.confirm(best.body, now)) return null;
    }
    this.spot = best.body; this.missing = false; this.candidate = null;
    return best.body;
  }

  private confirm(body: Body, now: number): boolean {
    const previous = this.candidate;
    if (!previous || distance(previous.center, body.center) / previous.width > tracking.confirmMove ||
        Math.abs(Math.log(body.width / previous.width)) > tracking.confirmMove) {
      this.candidate = body; this.since = now; return false;
    }
    return now - this.since >= tracking.confirmMs;
  }

  private guide(found: readonly Body[]): void {
    const spot = this.spot;
    if (!spot) return;
    const nearest = [...found].sort((a, b) => distance(a.center, spot.center) - distance(b.center, spot.center))[0];
    if (!nearest) return;
    const dx = (nearest.center.x - spot.center.x) / spot.width;
    const dy = (nearest.center.y - spot.center.y) / spot.width;
    this.guidance = Math.abs(dx) > 0.4 ? (dx > 0 ? "left" : "right")
      : nearest.width < spot.width * 0.8 ? "closer" : nearest.width > spot.width * 1.25 ? "back"
      : Math.abs(dy) > 0.4 ? (dy > 0 ? "up" : "down") : "return";
  }
}

/** A face must uniquely match the visible player's nose. */
export function ownFace(faces: readonly Landmarks[], body: Body, visibility: number): number {
  const nose = body.pose[POSE.nose];
  if (!nose || nose.visibility < visibility) return -1;
  const candidates = faces.flatMap((face, index) => {
    const point = face[1];
    const gap = point ? distance(point, nose) / body.width : Infinity;
    return gap <= tracking.faceNear ? [{ index, gap }] : [];
  }).sort((a, b) => a.gap - b.gap);
  if (!candidates[0] || (candidates[1] && candidates[1].gap - candidates[0].gap < tracking.subjectAmbiguity)) return -1;
  return candidates[0].index;
}
