import { POSE, type Point } from "./geometry";

/**
 * Bodies for the tests, on the stage (x across about 0 to 1.78, y down 0 to 1). A person stands with
 * shoulders 0.2 apart at x, arms down. Replace or add to these with poses recorded in the classroom.
 */
type Parts = Partial<Record<keyof typeof POSE, [number, number]>>;

export function person(x: number, parts: Parts = {}, width = 0.2): Point[] {
  const half = width / 2;
  const at: Record<keyof typeof POSE, [number, number]> = {
    nose: [x, 0.5 - 0.6 * width],
    leftShoulder: [x - half, 0.5],
    rightShoulder: [x + half, 0.5],
    leftWrist: [x - half, 0.5 + 1.4 * width],
    rightWrist: [x + half, 0.5 + 1.4 * width],
    leftHip: [x - 0.4 * width, 0.5 + 1.6 * width],
    rightHip: [x + 0.4 * width, 0.5 + 1.6 * width],
    ...parts,
  };
  const points: Point[] = Array.from({ length: 33 }, () => ({ x, y: 0.5, visibility: 0.9 }));
  for (const [name, index] of Object.entries(POSE) as [keyof typeof POSE, number][]) {
    points[index] = { x: at[name][0], y: at[name][1], visibility: 0.9 };
  }
  return points;
}

/** The poses, for a person at x with shoulders 0.2 apart. */
export const poses = {
  armsDown: (x = 0.9) => person(x),
  armsRaised: (x = 0.9) => person(x, { leftWrist: [x - 0.15, 0.05], rightWrist: [x + 0.15, 0.05] }),
  handsOnHead: (x = 0.9) => person(x, { leftWrist: [x - 0.06, 0.29], rightWrist: [x + 0.06, 0.29] }),
  praying: (x = 0.9) => person(x, { leftWrist: [x - 0.02, 0.6], rightWrist: [x + 0.02, 0.6] }),
};

/**
 * A hand hanging down from its wrist at (0.5, 0.5), 0.1 from wrist to middle knuckle, with the index finger
 * pointing down. `others` stretches the other fingers too, and `up` turns the index finger up instead.
 */
export function hand({ others = false, up = false } = {}): Point[] {
  const at = (x: number, y: number): Point => ({ x, y, visibility: 1 });
  const finger = (x: number, extended: boolean, flip = false): Point[] => {
    const sign = flip ? -1 : 1;
    return extended
      ? [at(x, 0.5 + sign * 0.1), at(x, 0.5 + sign * 0.14), at(x, 0.5 + sign * 0.17), at(x, 0.5 + sign * 0.2)]
      : [at(x, 0.6), at(x, 0.64), at(x, 0.62), at(x, 0.6)];
  };
  return [at(0.5, 0.5), ...Array.from({ length: 4 }, () => at(0.46, 0.55)), ...finger(0.48, true, up), ...finger(0.5, others), ...finger(0.52, others), ...finger(0.54, others)];
}
