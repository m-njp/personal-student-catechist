import { tracking } from "./config";

export type Light = "ok" | "dark" | "backlit";

/** Where a player stands in the camera's own picture, from 0 to 1, not mirrored. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Whether the players can be seen, from a small copy of the frame (RGBA). Players much darker than the
 * room behind them usually stand against a bright window.
 */
export function lighting(pixels: ArrayLike<number>, width: number, height: number, players: readonly Box[]): Light {
  let inside = 0;
  let insideCount = 0;
  let outside = 0;
  let outsideCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luma = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      if (players.some((box) => u >= box.left && u <= box.right && v >= box.top && v <= box.bottom)) {
        inside += luma;
        insideCount++;
      } else {
        outside += luma;
        outsideCount++;
      }
    }
  }
  const playerLight = insideCount > 0 ? inside / insideCount : outside / Math.max(1, outsideCount);
  if (playerLight < tracking.dark) return "dark";
  if (insideCount > 0 && outsideCount > 0 && outside / outsideCount - playerLight > tracking.backlight) return "backlit";
  return "ok";
}
