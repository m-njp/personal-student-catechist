import { POSE } from "./geometry";
import type { Body } from "./players";

export interface Sample { data: Uint8ClampedArray; width: number; height: number }

/** A tiny torso histogram, held in memory only. Samples use the exact frame sent to inference. */
export function appearance(body: Body, sample: Sample | null, aspect: number, visibility: number): readonly number[] | null {
  if (!sample) return null;
  const shoulders = [body.pose[POSE.leftShoulder], body.pose[POSE.rightShoulder]];
  const hips = [body.pose[POSE.leftHip], body.pose[POSE.rightHip]];
  const visibleHips = hips.filter(point => point && point.visibility >= visibility);
  const hipY = visibleHips.length ? visibleHips.reduce((sum, point) => sum + point.y, 0) / visibleHips.length : body.center.y + body.width;
  const top = body.center.y + body.width * 0.15;
  const bottom = Math.min(hipY, body.center.y + body.width);
  if (bottom <= top) return null;
  const left = Math.min(...shoulders.map(point => point.x)) + body.width * 0.2;
  const right = Math.max(...shoulders.map(point => point.x)) - body.width * 0.2;
  const bins = Array<number>(28).fill(0);
  // Soft bins avoid flicker at a color boundary; chromaticity tolerates camera exposure changes.
  const add = (offset: number, value: number, last: number, weight: number) => {
    const index = Math.floor(value), fraction = value - index;
    bins[offset + index] += weight * (1 - fraction);
    bins[offset + Math.min(last, index + 1)] += weight * fraction;
  };
  let count = 0;
  for (let y = Math.max(0, Math.ceil(top * sample.height)); y < Math.min(sample.height, bottom * sample.height); y++) {
    for (let x = Math.max(0, Math.ceil((1 - right / aspect) * sample.width)); x < Math.min(sample.width, (1 - left / aspect) * sample.width); x++) {
      const offset = (y * sample.width + x) * 4;
      const total = sample.data[offset] + sample.data[offset + 1] + sample.data[offset + 2];
      if (total < 30) continue;
      for (let channel = 0; channel < 3; channel++) add(channel * 8, sample.data[offset + channel] / total * 7, 7, 0.85 / 3);
      add(24, total / 765 * 3, 3, 0.15);
      count++;
    }
  }
  return count >= 4 ? bins.map(value => value / count) : null;
}
