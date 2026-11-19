import type { Atlas } from "./Atlas";

/** Colors and text sizes the canvas needs, read from the design tokens. */
export interface PaintStyle {
  bubble: string;
  bubbleInk: string;
  signInk: string;
  night: string;
  flash: string;
  warm: string;
  /** Text sizes in game pixels; the game is drawn for a screen 270 pixels tall. */
  bubbleSize: number;
  signSize: number;
}

export interface DrawOptions {
  alpha?: number;
  faded?: boolean;
  flip?: boolean;
  /** Part of the picture only, from its top left. */
  crop?: readonly [number, number, number, number];
}

export type Pose = "idle" | "wave" | "cheer";

/** The game is drawn for a screen this many pixels tall; the width follows the screen. */
export const VIEW_H = 270;
/** Every side and front figure is drawn on a sheet this wide, centered on these columns. */
const SIDE_CENTER = 19;
const FRONT_CENTER = 20;

export function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

export function between(p: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (p - from) / (to - from)));
}

/** A hop that rises and lands within one beat, 0 to 1. */
export function hop(t: number, height = 5): number {
  return t > 0 && t < 1 ? Math.sin(t * Math.PI) * height : 0;
}

/** A steady number from a name, so each person blinks and waves on their own beat. */
export function hash(text: string): number {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h;
}

/**
 * Draws pictures from the atlas in world or screen positions. Every scene draws through one Painter,
 * so pixel snapping, shadows, and speech bubbles look the same everywhere.
 */
export class Painter {
  scale = 1;
  width = 480;
  cam = 0;
  clock = 0;
  readonly feet: number;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly atlas: Atlas,
    readonly font: string,
    readonly style: PaintStyle,
    readonly calm: boolean,
  ) {
    this.feet = atlas.meta.groundTop + atlas.meta.feetRow;
  }

  px(v: number): number {
    return Math.round(v * this.scale) / this.scale;
  }

  size(name: string): readonly [number, number] {
    const [, , w, h] = this.atlas.frame(name);
    return [w, h];
  }

  /** True if anything between these world positions is on screen. */
  visible(left: number, right: number): boolean {
    return right - this.cam > -24 && left - this.cam < this.width + 24;
  }

  sprite(name: string, x: number, y: number, options: DrawOptions = {}) {
    const [fx, fy, fw, fh] = this.atlas.frame(name);
    const [cx, cy, cw, ch] = options.crop ?? [0, 0, fw, fh];
    const alpha = options.alpha ?? 1;
    if (alpha <= 0 || cw <= 0 || ch <= 0) return;
    const { ctx } = this;
    const source = options.faded ? this.atlas.sepia : this.atlas.image;
    ctx.globalAlpha = Math.min(1, alpha);
    const dx = this.px(x + (options.flip ? fw - cx - cw : cx));
    const dy = this.px(y + cy);
    if (options.flip) {
      ctx.save();
      ctx.translate(dx + cw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(source, fx + cx, fy + cy, cw, ch, 0, 0, cw, ch);
      ctx.restore();
    } else {
      ctx.drawImage(source, fx + cx, fy + cy, cw, ch, dx, dy, cw, ch);
    }
    ctx.globalAlpha = 1;
  }

  /** A picture standing on the ground: `worldLeft` is its left in the world, `bottom` its lowest row on screen. */
  standing(name: string, worldLeft: number, bottom: number, options: DrawOptions = {}) {
    const [, h] = this.size(name);
    this.sprite(name, worldLeft - this.cam, bottom - h, options);
  }

  /** A person with their soles on (worldX, feet), over a soft shadow. */
  person(name: string, worldX: number, feet: number, options: DrawOptions & { side?: boolean; lift?: number } = {}) {
    const [w, h] = this.size(name);
    const center = options.side ? SIDE_CENTER : FRONT_CENTER;
    const left = worldX - this.cam - (options.flip ? w - 1 - center : center);
    const [sw] = this.size("shadow");
    const lift = options.lift ?? 0;
    const shadowAlpha = (options.alpha ?? 1) * (options.faded ? 0.5 : 1) * (1 - Math.min(0.6, lift / 12));
    this.sprite("shadow", worldX - this.cam - sw / 2, feet - 4, { alpha: shadowAlpha });
    this.sprite(name, left, feet - lift - (h - 2), options);
  }

  /** Someone facing the class: breathing, blinking now and then, waving, or cheering. */
  front(id: string, pose: Pose = "idle", offset = 0): string {
    const t = this.clock + hash(id) * 7 + offset;
    if (pose === "wave") return `${id}-wave-${Math.floor(t / 210) % 2}`;
    if (pose === "cheer") return `${id}-cheer-${Math.floor(t / 180) % 2}`;
    if (t % 3700 < 140) return `${id}-blink`;
    return `${id}-idle-${Math.floor(t / 720) % 2}`;
  }

  sparkle(worldX: number, y: number, p: number) {
    if (p <= 0 || p >= 1) return;
    this.sprite(`sparkle-${Math.min(3, Math.floor(p * 4))}`, worldX - this.cam - 5, y - 5);
  }

  dust(worldX: number, y: number, p: number) {
    if (p <= 0 || p >= 1) return;
    const [w, h] = this.size("dust-0");
    this.sprite(`dust-${Math.min(3, Math.floor(p * 4))}`, worldX - this.cam - w / 2, y - h);
  }

  /** A speech bubble with its tail pointing down at (worldX, bottom). */
  bubble(text: string, worldX: number, bottom: number, alpha = 1) {
    if (!text || alpha <= 0) return;
    const { ctx, style } = this;
    ctx.globalAlpha = alpha;
    ctx.font = `600 ${style.bubbleSize}px ${this.font}`;
    const w = Math.ceil(ctx.measureText(text).width) + style.bubbleSize;
    const h = Math.round(style.bubbleSize * 1.5);
    const cx = worldX - this.cam;
    const left = this.px(Math.min(this.width - w - 2, Math.max(2, cx - w / 2)));
    const top = this.px(bottom - h);
    ctx.fillStyle = style.bubbleInk;
    ctx.fillRect(left - 1, top, w + 2, h);
    ctx.fillRect(left, top - 1, w, h + 2);
    ctx.fillStyle = style.bubble;
    ctx.fillRect(left, top, w, h);
    ctx.fillStyle = style.bubbleInk;
    ctx.fillRect(this.px(cx - 1), top + h, 3, 2);
    ctx.fillRect(this.px(cx), top + h + 2, 1, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, left + w / 2, top + h / 2 + 0.5);
    ctx.globalAlpha = 1;
  }

  /** A flat color over the whole screen, for fades and flashes. */
  cover(color: string, alpha: number) {
    if (alpha <= 0) return;
    const { ctx } = this;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width + 1, VIEW_H + 1);
    ctx.globalAlpha = 1;
  }
}
