import { tracking, type Thresholds } from "./config";
import { distance, HAND_KNUCKLE, HAND_WRIST, POSE, type Landmarks } from "./geometry";
import type { Body } from "./players";

/** One hand per wrist. Ambiguous hands are safer to omit than give to the wrong player. */
export function assignHands(hands: readonly Landmarks[], players: readonly (Body | null)[], t: Thresholds): readonly ({ player: number; wrist: number } | null)[] {
  const candidates = hands.map((hand, index) => {
    const pairs: { player: number; wrist: number; gap: number }[] = [];
    if (!hand[HAND_WRIST] || !hand[HAND_KNUCKLE]) return { index, pairs };
    const size = distance(hand[HAND_WRIST], hand[HAND_KNUCKLE]);
    players.forEach((body, player) => {
      if (!body || size < tracking.handSize * body.width) return;
      for (const wrist of [POSE.leftWrist, POSE.rightWrist]) {
        const anchor = body.pose[wrist];
        if (!anchor || anchor.visibility < t.visibility) continue;
        const gap = distance(hand[HAND_WRIST], anchor) / body.width;
        if (gap <= tracking.matchNear) pairs.push({ player, wrist, gap });
      }
    });
    pairs.sort((a, b) => a.gap - b.gap);
    return { index, pairs };
  });
  const result: ({ player: number; wrist: number } | null)[] = hands.map(() => null);
  const taken = new Set<string>();
  candidates.sort((a, b) => (a.pairs[0]?.gap ?? Infinity) - (b.pairs[0]?.gap ?? Infinity));
  for (const { index, pairs } of candidates) {
    const first = pairs[0];
    if (!first || (pairs[1] && pairs[1].gap - first.gap < tracking.handAmbiguity)) continue;
    const key = first.player + ":" + first.wrist;
    if (taken.has(key)) continue;
    taken.add(key);
    result[index] = { player: first.player, wrist: first.wrist };
  }
  return result;
}
