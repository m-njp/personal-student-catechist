import type { Thresholds } from "./config";
import { tracking } from "./config";
import { distance, middle, POSE, type Landmarks, type Point } from "./geometry";

/** A body the camera sees well enough to play: where its shoulders are, and how wide. */
export interface Body {
  pose: Landmarks;
  center: Point;
  width: number;
}

/** Where a locked player was last seen. Blue is first, on the left of the mirrored view; Orange is second. */
export interface Spot {
  center: Point;
  width: number;
}

/**
 * Bodies standing close enough to play, closest first. Wider shoulders mean closer to the camera, so pupils
 * sitting farther back, smaller than the player size, are left out here and never read.
 */
export function bodies(poses: readonly Landmarks[], t: Thresholds): Body[] {
  const found: Body[] = [];
  for (const pose of poses) {
    const left = pose[POSE.leftShoulder];
    const right = pose[POSE.rightShoulder];
    if (!left || !right || left.visibility < t.visibility || right.visibility < t.visibility) continue;
    const width = distance(left, right);
    if (width >= t.playerSize) found.push({ pose, center: middle(left, right), width });
  }
  return found.sort((a, b) => b.width - a.width);
}

/**
 * The closest body, and the next closest when it stands about as near, Blue on the left. Someone far
 * behind a lone player is never locked as the second player. Null until anyone is seen.
 */
export function lockPlayers(found: readonly Body[]): Spot[] | null {
  const [first, second] = found;
  if (!first) return null;
  const near = second && second.width >= tracking.followWidth * first.width ? [first, second] : [first];
  return near.sort((a, b) => a.center.x - b.center.x).map((body) => ({ center: body.center, width: body.width }));
}

/**
 * Which body each locked player is now, or null when they are out of sight. A body must be about as close
 * as the player was and near where they stood, so someone walking past behind never takes their place.
 * Nearest pairs are matched first, so two players never swap.
 */
export function follow(spots: readonly Spot[], found: readonly Body[]): (Body | null)[] {
  const pairs: { spot: number; body: number; gap: number }[] = [];
  spots.forEach((spot, s) =>
    found.forEach((body, b) => {
      const gap = distance(spot.center, body.center) / spot.width;
      if (body.width >= tracking.followWidth * spot.width && gap <= tracking.followMove) pairs.push({ spot: s, body: b, gap });
    }),
  );
  pairs.sort((a, b) => a.gap - b.gap);
  const result: (Body | null)[] = spots.map(() => null);
  const taken = new Set<number>();
  for (const pair of pairs) {
    if (result[pair.spot] || taken.has(pair.body)) continue;
    result[pair.spot] = found[pair.body];
    taken.add(pair.body);
  }
  return result;
}

/**
 * Which player each point belongs to: a hand's wrist to the nearest player's wrist, or a face's nose to
 * the nearest player's nose. -1 when no player is near enough, such as a hand of someone behind them.
 * With `sizes`, a hand must also be big enough for that player, since a pupil behind has a smaller hand.
 */
export function owners(
  points: readonly Point[],
  players: readonly (Body | null)[],
  anchors: readonly number[],
  sizes?: readonly number[],
): number[] {
  return points.map((point, i) => {
    let owner = -1;
    let best = Infinity;
    players.forEach((player, p) => {
      if (!player) return;
      if (sizes && sizes[i] < tracking.handSize * player.width) return;
      for (const anchor of anchors) {
        if (!player.pose[anchor] || player.pose[anchor].visibility < 0.6) continue;
        const gap = distance(point, player.pose[anchor]) / player.width;
        if (gap <= tracking.matchNear && gap < best) {
          best = gap;
          owner = p;
        }
      }
    });
    return owner;
  });
}
