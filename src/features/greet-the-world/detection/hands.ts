import { tracking, type Thresholds } from "./config";
import { distance, HAND_KNUCKLE, HAND_WRIST, POSE, type Landmarks } from "./geometry";
import type { Body } from "./players";

/** At most one hand per visible wrist. Background and ambiguous hands are omitted. */
export function assignHands(hands: readonly Landmarks[], body: Body, t: Thresholds): readonly (number | null)[] {
  const candidates = hands.map((hand, index) => {
    if (!hand[HAND_WRIST] || !hand[HAND_KNUCKLE] || distance(hand[HAND_WRIST], hand[HAND_KNUCKLE]) < tracking.handSize * body.width) return { index, pairs: [] };
    const pairs = [POSE.leftWrist, POSE.rightWrist].flatMap(wrist => {
      const anchor = body.pose[wrist];
      const gap = anchor && anchor.visibility >= t.visibility ? distance(hand[HAND_WRIST], anchor) / body.width : Infinity;
      return gap <= tracking.matchNear ? [{ wrist, gap }] : [];
    }).sort((a, b) => a.gap - b.gap);
    return { index, pairs };
  }).sort((a, b) => (a.pairs[0]?.gap ?? Infinity) - (b.pairs[0]?.gap ?? Infinity));
  const result: (number | null)[] = hands.map(() => null);
  const taken = new Set<number>();
  for (const { index, pairs } of candidates) {
    const first = pairs[0];
    if (!first || taken.has(first.wrist) || (pairs[1] && pairs[1].gap - first.gap < tracking.handAmbiguity)) continue;
    taken.add(first.wrist); result[index] = first.wrist;
  }
  return result;
}
