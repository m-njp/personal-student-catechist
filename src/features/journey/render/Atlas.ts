export type Rect = readonly [x: number, y: number, w: number, h: number];

export interface AtlasMeta {
  screenH: number;
  groundTop: number;
  feetRow: number;
  loop: number;
  globeFrames: number;
  /** The open doorway, from the church's top left. */
  door: Rect;
  /** Rows from the bottom of a kid's sprite to the bamboo pole on their shoulder. */
  poleRise: number;
  /** The wall's bricks from the bottom row up, from the wall's top left. */
  bricks: readonly Rect[];
}

export interface AtlasData {
  frames: Record<string, Rect>;
  meta: AtlasMeta;
}

/**
 * Every picture in the game, packed by tools/journey-art. Also keeps a faded, sepia copy, used for
 * memories the pupil has not reached yet.
 */
export class Atlas {
  readonly sepia: HTMLCanvasElement;

  constructor(
    readonly image: HTMLImageElement,
    readonly data: AtlasData,
  ) {
    this.sepia = fade(image);
  }

  frame(name: string): Rect {
    const frame = this.data.frames[name];
    if (!frame) throw new Error(`No picture named "${name}" in the journey atlas.`);
    return frame;
  }

  has(name: string): boolean {
    return name in this.data.frames;
  }

  get meta(): AtlasMeta {
    return this.data.meta;
  }

  /** Frees the sepia copy; the canvas is large. */
  dispose(): void {
    this.sepia.width = 0;
    this.sepia.height = 0;
  }
}

/** A warm, washed out copy of the picture, like an old photograph. */
function fade(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const soft = 70 + lum * 0.7;
    d[i] = Math.min(255, soft * 1.08 + 12);
    d[i + 1] = Math.min(255, soft * 0.98 + 6);
    d[i + 2] = Math.min(255, soft * 0.82);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export async function loadAtlas(base: string): Promise<Atlas> {
  const [image, data] = await Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The journey pictures did not load."));
      img.src = `${base}/atlas.png`;
    }),
    fetch(`${base}/atlas.json`).then((response) => {
      if (!response.ok) throw new Error("The journey picture list did not load.");
      return response.json() as Promise<AtlasData>;
    }),
  ]);
  return new Atlas(image, data);
}
