import type { JourneyContent } from "../content";
import type { Journey } from "../Journey";
import { MEMORY_COUNT, stopX } from "../route";
import type { Atlas } from "./Atlas";
import { drawChurch, drawChurchSky, drawConfetti, drawFiesta } from "./church";
import { drawBayan, drawGlobe, drawKubo, drawWall, MEMORY_SPAN, replayFocus, type Stage } from "./memories";
import { between, ease, hash, hop, Painter, VIEW_H, type PaintStyle } from "./Painter";
import { drawRoadsideBack, drawRoadsideFront, pupilLine, pupilPose } from "./roadside";

/** Where the pupil walks, as a share of the screen's width from the left. */
const WALKER_AT = 0.3;
const PARALLAX = { far: 0.12, mid: 0.35, near: 0.68, front: 1.25, clouds: 0.06 };
const LAYER_TOP = { far: 100, mid: 116, near: 84 };
/** How long the answer's celebration lasts. */
const CELEBRATE_MS = 2400;
const FADE_MS = 550;

/**
 * Draws A Journey to Remember on a canvas, every frame, from the Journey's state. Holds no rules:
 * where things are comes from the route and the Journey, what they look like from the atlas.
 */
export class Renderer {
  private readonly p: Painter;
  private camReady = false;
  /** When the screen last faded in from night, and when it last flashed. */
  private fadeAt = -1e9;
  private flashAt = -1e9;
  private flashColor: string;
  private readonly stop: () => void;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    atlas: Atlas,
    private readonly journey: Journey,
    private readonly content: JourneyContent,
    font: string,
    style: PaintStyle,
    calm: boolean,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw the journey.");
    this.p = new Painter(ctx, atlas, font, style, calm);
    this.flashColor = style.flash;
    this.stop = journey.on((event) => {
      if (event.type === "start" || event.type === "jump" || event.type === "restart") {
        this.fadeAt = journey.clock;
        this.camReady = false;
      } else if (event.type === "arrive") {
        this.flash(style.flash);
      } else if (event.type === "church") {
        this.flash(style.warm);
      }
    });
  }

  /** Matches the canvas to its box in device pixels, so pixel art stays sharp. */
  resize(cssWidth: number, cssHeight: number, ratio: number): void {
    this.canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    this.canvas.height = Math.max(1, Math.round(cssHeight * ratio));
    this.p.scale = this.canvas.height / VIEW_H;
    this.p.width = this.canvas.width / this.p.scale;
    this.camReady = false;
  }

  dispose(): void {
    this.stop();
  }

  draw(dt: number): void {
    const { p, journey, content } = this;
    p.clock = journey.clock;
    this.moveCamera(dt);
    const { ctx } = p;
    ctx.setTransform(p.scale, 0, 0, p.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;

    this.drawSky(this.goldness());
    this.drawLayer("far", PARALLAX.far, LAYER_TOP.far);
    this.drawLayer("mid", PARALLAX.mid, LAYER_TOP.mid);
    drawChurchSky(p, journey);
    this.drawLayer("near", PARALLAX.near, LAYER_TOP.near);
    this.drawGround();
    this.drawSigns();
    drawChurch(p, journey, content);
    drawRoadsideBack(p, journey, content);
    for (let i = 0; i < MEMORY_COUNT; i += 1) this.drawMemory(i);
    this.drawPupil();
    drawRoadsideFront(p, journey, content);
    drawFiesta(p, journey);
    this.drawButterflies();
    this.drawFront();
    this.drawCelebration();
    this.drawTransitions();
  }

  // Camera ---------------------------------------------------------------------------------------

  private moveCamera(dt: number) {
    const { journey, p } = this;
    const church = stopX(MEMORY_COUNT, journey.timing);
    let target = journey.x - p.width * WALKER_AT;
    const phase = journey.current;
    const memory = journey.memoryIndex;
    if (memory >= 0 && memory < MEMORY_COUNT) {
      const stop = stopX(memory, journey.timing);
      if (phase === "replay") {
        // A memory is a flashback, so the camera may leave the pupil to follow it.
        target = replayFocus(memory, stop, journey.phaseMs / journey.timing.replayMs) - p.width / 2;
        target = Math.max(target, stop - p.width + 40);
      } else if (phase === "ask" || phase === "answer") {
        target = Math.min(stop - 24 + (MEMORY_SPAN[memory] + 24) / 2 - p.width / 2, journey.x - 24);
      }
    }
    target = Math.min(target, church - p.width / 2);
    if (!this.camReady) {
      p.cam = target;
      this.camReady = true;
      return;
    }
    p.cam += (target - p.cam) * (1 - Math.exp(-dt / 420));
  }

  /** How far into the golden evening the walk is: 0 by day, 1 at the Church. */
  private goldness(): number {
    const { journey } = this;
    if (journey.current === "end") return 1;
    const last = stopX(MEMORY_COUNT - 1, journey.timing);
    const church = stopX(MEMORY_COUNT, journey.timing);
    return between(journey.x, last + 120, church - 80);
  }

  // Sky and land ---------------------------------------------------------------------------------

  private drawSky(gold: number) {
    const { p } = this;
    const { ctx } = p;
    const [dx, dy, dw, dh] = p.atlas.frame("sky-day");
    ctx.drawImage(p.atlas.image, dx, dy, dw, dh, 0, 0, p.width + 1, VIEW_H);
    if (gold > 0) {
      const [gx, gy, gw, gh] = p.atlas.frame("sky-gold");
      ctx.globalAlpha = gold;
      ctx.drawImage(p.atlas.image, gx, gy, gw, gh, 0, 0, p.width + 1, VIEW_H);
      ctx.globalAlpha = 1;
    }
    const [sw] = p.size("sun");
    p.sprite("sun", p.width * 0.8 - sw / 2, 14 + gold * 62);
    if (!p.calm) {
      for (let k = 0; k < 3; k += 1) {
        const span = p.width + 60;
        const bx = ((((k * 211 - p.clock * 0.012 - p.cam * 0.02) % span) + span) % span) - 30;
        p.sprite(`bird-${Math.floor(p.clock / 260 + k) % 2}`, bx, 34 + k * 9 + Math.sin(p.clock / 900 + k) * 3);
      }
    }
    const clouds = [[0, 40, 0], [1, 66, 260], [2, 28, 520], [3, 54, 760]] as const;
    for (const [i, y, start] of clouds) {
      const span = p.width + 160;
      const drift = p.calm ? 0 : p.clock * 0.004;
      const x = ((((start - p.cam * PARALLAX.clouds - drift) % span) + span) % span) - 80;
      p.sprite(`cloud-${i}`, x, y);
    }
  }

  private drawLayer(name: "far" | "mid" | "near", factor: number, top: number) {
    const { p } = this;
    const loop = p.atlas.meta.loop;
    const offset = -((((p.cam * factor) % loop) + loop) % loop);
    for (let x = offset; x < p.width; x += loop) p.sprite(name, x, top);
  }

  private drawGround() {
    const { p } = this;
    const [w] = p.size("ground");
    const offset = -(((p.cam % w) + w) % w);
    for (let x = offset; x < p.width; x += w) p.sprite("ground", x, p.atlas.meta.groundTop);
  }

  private drawFront() {
    const { p } = this;
    const step = 150;
    const first = Math.floor((p.cam * PARALLAX.front) / step) - 1;
    for (let k = first; k < first + p.width / step + 3; k += 1) {
      const x = k * step + (hash(String(k)) % 60) - p.cam * PARALLAX.front;
      p.sprite(`tuft-${((k % 3) + 3) % 3}`, x, VIEW_H - 15);
    }
  }

  private drawButterflies() {
    const { p } = this;
    if (p.calm) return;
    for (let k = 0; k < 9; k += 1) {
      const home = 160 + k * 380;
      const x = home + Math.sin(p.clock / 1300 + k) * 26;
      if (!p.visible(x, x)) continue;
      const y = p.feet - 34 + Math.sin(p.clock / 330 + k * 2) * 7;
      const kind = k % 2 ? "butterfly-pink" : "butterfly";
      p.sprite(`${kind}-${Math.floor(p.clock / 110 + k) % 2}`, x - p.cam, y);
    }
  }

  private drawSigns() {
    const { p } = this;
    const { ctx, style } = p;
    for (let i = 0; i < MEMORY_COUNT; i += 1) {
      const x = stopX(i, this.journey.timing) - 64;
      if (!p.visible(x, x + 30)) continue;
      p.standing("sign", x, p.feet - 3);
      const [w, h] = p.size("sign");
      ctx.fillStyle = style.signInk;
      ctx.font = `700 ${style.signSize}px ${p.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), p.px(x - p.cam + w / 2), p.px(p.feet - 3 - h + 11));
    }
  }

  // Memories -------------------------------------------------------------------------------------

  private stage(memory: number): Stage {
    const { journey } = this;
    const current = journey.memoryIndex;
    if (current > memory) return { kind: "done" };
    if (current < memory) return { kind: "ahead" };
    if (journey.current === "replay") return { kind: "replay", p: journey.phaseMs / journey.timing.replayMs };
    if (journey.current === "title") return { kind: "ahead" };
    return { kind: "done" };
  }

  /** 1 as the answer shows, easing to 0, for the memory being answered. */
  private celebrate(memory: number): number {
    const { journey } = this;
    if (journey.current !== "answer" || journey.memoryIndex !== memory) return 0;
    return Math.max(0, 1 - journey.phaseMs / CELEBRATE_MS);
  }

  private drawMemory(memory: number) {
    const { p, journey } = this;
    const stop = stopX(memory, journey.timing);
    if (!p.visible(stop - 40, stop + MEMORY_SPAN[memory] + 120)) return;
    const stage = this.stage(memory);
    const celebrate = this.celebrate(memory);
    if (memory === 0) drawWall(p, stop, stage, celebrate);
    else if (memory === 1) drawBayan(p, stop, stage, celebrate);
    else if (memory === 2) drawKubo(p, stop, stage, celebrate);
    else {
      const talking = journey.memoryIndex === 3 && (journey.current === "ask" || journey.current === "answer");
      drawGlobe(p, stop, stage, celebrate, this.content.greetings, talking);
    }
  }

  // The pupil ------------------------------------------------------------------------------------

  private drawPupil() {
    const { p, journey } = this;
    const phase = journey.current;
    if (phase === "end") return;
    const quest = pupilPose(journey);
    const celebrating = phase === "answer" && journey.phaseMs < CELEBRATE_MS;
    if (celebrating) {
      p.person(p.front("pupil", "cheer"), journey.x, p.feet + 1, { lift: hop((journey.phaseMs % 600) / 600, 5) });
    } else if (quest.front) {
      p.person(p.front("pupil", quest.pose), journey.x, p.feet + 1);
    } else {
      const walking = phase === "walk" && !journey.holding;
      const frame = walking ? `pupil-walk-${Math.floor(journey.x / 5) % 8}` : "pupil-stand";
      p.person(frame, journey.x, p.feet + 1, { side: true });
    }
    const line = pupilLine(journey, this.content);
    if (line) p.bubble(line.text, journey.x, p.feet - 50, line.alpha);
    if (phase === "answer") {
      const t = journey.phaseMs / 900;
      for (let k = 0; k < 5; k += 1) p.sparkle(journey.x - 14 + k * 7, p.feet - 50 - (k % 2) * 8, t - k * 0.08);
    }
  }

  // Feedback and transitions ---------------------------------------------------------------------

  private drawCelebration() {
    const { journey, p } = this;
    if (journey.current !== "answer") return;
    drawConfetti(p, journey.phaseMs, CELEBRATE_MS + 600, p.cam + p.width / 2);
  }

  private flash(color: string) {
    this.flashAt = this.journey.clock;
    this.flashColor = color;
  }

  private drawTransitions() {
    const { p, journey } = this;
    // A memory looks like an old photograph: dark, dithered corners while it plays.
    let memoryLook = 0;
    if (journey.current === "replay") memoryLook = ease(journey.phaseMs / 500);
    else if (journey.current === "ask") memoryLook = 1 - ease(journey.phaseMs / 600);
    if (memoryLook > 0) {
      const [vx, vy, vw, vh] = p.atlas.frame("vignette");
      p.ctx.globalAlpha = memoryLook;
      p.ctx.drawImage(p.atlas.image, vx, vy, vw, vh, 0, 0, p.width + 1, VIEW_H);
      p.ctx.globalAlpha = 1;
    }
    p.cover(this.flashColor, 0.55 * (1 - ease((journey.clock - this.flashAt) / 450)));
    p.cover(p.style.night, 1 - ease((journey.clock - this.fadeAt) / FADE_MS));
  }
}
