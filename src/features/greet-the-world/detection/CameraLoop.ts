import type { Classifications } from "@mediapipe/tasks-vision";
import { Observable } from "@/core/Observable";
import { READINGS, type Reading } from "../content";
import { tracking, type Thresholds } from "./config";
import type { DetectionLog, PlayerColor } from "./DetectionLog";
import { FACE_NOSE, POSE, toStage, type Landmarks } from "./geometry";
import { lighting, type Box, type Light } from "./lighting";
import type { Models } from "./models";
import type { Inference } from "./protocol";
import { assignHands } from "./hands";
import { bodies, follow, lockPlayers, owners, type Body, type Spot } from "./players";
import {
  bodyLevels,
  faceLevels,
  playerHandLevels,
  restingFace,
  type Blendshapes,
  type Gesture,
  type Levels,
  type AssignedHand,
} from "./readings";
import { heldSince, smooth, type Steady } from "./steady";

export type CameraError = "blocked" | "busy" | "missing" | "failed";

export interface PlayerView {
  found: boolean;
  face: boolean;
  /** Readings on now, strongest first. */
  on: readonly Reading[];
  /** Readings held for the hold time. */
  held: readonly Reading[];
}

/** What React shows. It changes only when something the class can see changes, never every frame. */
export interface CameraView {
  status: "starting" | "running" | "error";
  error: CameraError | null;
  /** Width over height of the camera's picture. */
  aspect: number;
  locked: boolean;
  players: readonly PlayerView[];
  detected: number;
  light: Light | null;
  /** Every reading either player has held since the camera opened, for the setup check. */
  passed: readonly Reading[];
}

export interface PlayerFrame {
  body: Body;
  /** The player's own face and hands, so the stage can show what is being read. */
  face: Landmarks | null;
  hands: readonly Landmarks[];
  handWrists: readonly number[];
  openPalms: number;
  /** Each reading's meter, 0 to 1. */
  shown: Readonly<Record<Reading, number>>;
  hold: Readonly<Record<Reading, number>>;
  raw: Levels;
  baseline: Blendshapes | null;
  /** The raw numbers, for the detector details. */
  gesture: Gesture | null;
  shapes: Blendshapes | null;
}

/** What the stage draws each frame, straight from the loop, without React. */
export interface Frame {
  aspect: number;
  bodies: readonly Body[];
  /** Blue, then Orange. */
  players: readonly (PlayerFrame | null)[];
  fps: number;
  timestamp: number;
  inferenceMs: number;
  resultAgeMs: number;
  visibility: number;
}

export interface CameraSettings {
  thresholds: Thresholds;
  holdMs: number;
}

const COLORS: readonly PlayerColor[] = ["blue", "orange"];
const FACE_READINGS = new Set<Reading>(["happy", "surprised"]);
const HAND_READINGS = new Set<Reading>(["thumbsUp", "thumbsDown", "pointingUp", "victory", "openPalm", "twoOpenPalms", "fist", "pointingDown"]);

interface Tracked {
  spot: Spot;
  lostAt: number | null;
  steady: Map<Reading, Steady>;
  since: Map<Reading, number>;
  /** Readings already logged as held, so each hold is logged once. */
  logged: Set<Reading>;
  /** The first face frames after the player is found, and the resting face worked out from them. */
  restingFrames: Blendshapes[];
  resting: Blendshapes | null;
}

const track = (spot: Spot): Tracked => ({
  spot,
  lostAt: null,
  steady: new Map(),
  since: new Map(),
  logged: new Set(),
  restingFrames: [],
  resting: null,
});

const nobody: PlayerView = { found: false, face: false, on: [], held: [] };

function cameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  return "failed";
}

const toShapes = (classifications: Classifications | undefined): Blendshapes | null =>
  classifications ? Object.fromEntries(classifications.categories.map((shape) => [shape.categoryName, shape.score])) : null;

/** Where a body stands in the camera's own picture, for the lighting check. */
function boxOf(pose: Landmarks, aspect: number): Box {
  const xs = pose.map((point) => 1 - point.x / aspect);
  const ys = pose.map((point) => point.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

/**
 * The camera sends fresh frames to a worker, at most 25 times a second. Each result
 * finds the closest players, gives them their hands and face, and smooths every reading. The stage
 * hears every frame through onFrame; React hears only changes, through subscribe.
 */
export class CameraLoop extends Observable<CameraView> {
  private stream: MediaStream | null = null;
  private frame = 0;
  private videoFrame: number | null = null;
  private capturing = false;
  private generation = 0;
  private receivedAt = 0;
  private observedAt = 0;
  private logAt = 0;
  private last = 0;
  private fps = 0;
  private lightAt = 0;
  private probe: HTMLCanvasElement | null = null;
  /** Counts each start and stop, so a camera that opens after the page closed is shut at once. */
  private run = 0;
  private tracked: Tracked[] | null = null;
  private videoTime = -1;
  private view: CameraView = { status: "starting", error: null, aspect: 16 / 9, locked: false, players: [], detected: 0, light: null, passed: [] };
  private readonly frameListeners = new Set<(frame: Frame) => void>();
  private settings: CameraSettings;
  private targets: readonly Reading[] | null = null;

  constructor(
    private readonly models: Models,
    private readonly video: HTMLVideoElement,
    private readonly log: DetectionLog,
    settings: CameraSettings,
  ) {
    super();
    this.settings = settings;
  }

  async start(): Promise<void> {
    this.stop();
    const run = ++this.run;
    this.last = 0;
    this.videoTime = -1;
    this.update({ status: "starting", error: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      if (run !== this.run) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      this.stream = stream;
      this.models.delegate = await this.models.client.initialize();
      if (run !== this.run) return;
      this.video.srcObject = stream;
      await this.video.play();
      if (run !== this.run) return;
      this.log.event({ what: "camera", detail: `${this.video.videoWidth}x${this.video.videoHeight}` });
      this.log.event({ what: "models", detail: this.models.delegate });
      this.update({ status: "running", aspect: this.video.videoWidth / this.video.videoHeight || this.view.aspect });
      this.schedule();
      this.frame = requestAnimationFrame(this.watch);
    } catch (error) {
      if (run === this.run) {
        this.stop();
        this.update({ status: "error", error: cameraError(error) });
      }
    }
  }

  /** Stops the camera and the loop. The models belong to the caller and stay open. */
  stop(): void {
    this.run++;
    cancelAnimationFrame(this.frame);
    if (this.videoFrame !== null) {
      if (typeof this.video.requestVideoFrameCallback === "function") this.video.cancelVideoFrameCallback(this.videoFrame);
      else cancelAnimationFrame(this.videoFrame);
      this.videoFrame = null;
    }
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.video.srcObject = null;
    this.tracked = null;
    this.receivedAt = 0;
    this.observedAt = 0;
    this.update({ locked: false, players: [], detected: 0, passed: [], light: null });
    this.clearFrame();
    if (this.probe) {
      this.probe.width = 0;
      this.probe.height = 0;
      this.probe = null;
    }
  }

  configure(settings: CameraSettings): void {
    this.settings = settings;
    this.target(this.targets ?? READINGS);
  }

  get holdMs(): number { return this.settings.holdMs; }

  /** Only the models needed for the current card run. Setup may request all readings. */
  target(readings: readonly Reading[]): void {
    this.targets = readings;
    this.generation++;
    this.tracked?.forEach((player) => {
      player.steady.clear();
      player.since.clear();
      player.logged.clear();
    });
    this.update({ players: this.view.players.map(player => ({ ...player, on: [], held: [] })) });
    this.clearFrame();
  }

  /** Forgets the players, so the closest people are found again with fresh resting faces. */
  relock(): void {
    this.generation++;
    this.tracked = null;
    this.update({ locked: false, players: [], passed: [] });
    this.clearFrame();
  }

  onFrame(listener: (frame: Frame) => void): () => void {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  protected createSnapshot(): CameraView {
    return this.view;
  }

  private update(patch: Partial<CameraView>): void {
    this.view = { ...this.view, ...patch };
    this.notify();
  }

  private clearFrame(): void {
    const frame: Frame = { aspect: this.view.aspect, bodies: [], players: [], fps: this.fps,
      timestamp: performance.now(), inferenceMs: 0, resultAgeMs: 0, visibility: this.settings.thresholds.visibility };
    for (const listener of this.frameListeners) listener(frame);
  }

  private invalidate(): void {
    this.target(this.targets ?? READINGS);
    this.update({ players: this.view.players.map(() => nobody) });
    this.receivedAt = 0;
    this.observedAt = 0;
  }

  private schedule(): void {
    this.videoFrame = typeof this.video.requestVideoFrameCallback === "function"
      ? this.video.requestVideoFrameCallback(this.tick)
      : requestAnimationFrame(this.tick);
  }

  /** Also runs when the camera freezes, so an old skeleton can never remain active. */
  private readonly watch = (now: number) => {
    if (this.observedAt && (now - this.observedAt > tracking.staleMs || document.hidden)) this.invalidate();
    this.frame = requestAnimationFrame(this.watch);
  };

  private readonly tick = (now: number) => {
    this.schedule();
    if (document.hidden || this.capturing || this.models.client.busy || now - this.last < tracking.everyMs || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (this.video.currentTime === this.videoTime) return;
    this.videoTime = this.video.currentTime;
    this.last = now;
    void this.capture(now);
  };

  private async capture(now: number): Promise<void> {
    const run = this.run;
    const generation = this.generation;
    this.capturing = true;
    try {
      const image = await createImageBitmap(this.video);
      if (run !== this.run || generation !== this.generation) { image.close(); return; }
      const result = await this.models.client.infer({ type: "frame", image, timestamp: now, run, generation,
        hands: !this.targets || this.targets.some(reading => HAND_READINGS.has(reading)),
        face: !this.targets || this.targets.some(reading => FACE_READINGS.has(reading)),
      });
      if (run !== this.run || generation !== this.generation || result.run !== run || result.generation !== generation) return;
      const received = performance.now();
      if (document.hidden || received - result.timestamp > tracking.staleMs) { this.invalidate(); return; }
      if (this.receivedAt) this.fps += 0.2 * (1000 / Math.max(1, received - this.receivedAt) - this.fps);
      this.receivedAt = received;
      this.observedAt = result.timestamp;
      this.read(result, received - result.timestamp);
    } catch {
      if (run === this.run) { this.stop(); this.update({ status: "error", error: "failed" }); }
    } finally { this.capturing = false; }
  }

  private read(result: Inference, resultAgeMs: number): void {
    const now = result.timestamp;
    const t = this.settings.thresholds;
    const { video } = this;
    const aspect = video.videoWidth / video.videoHeight;
    const found = bodies(
      result.pose.landmarks.map((pose) => toStage(pose, aspect, true)),
      t,
    );

    // A second player who steps up beside a lone player is locked too.
    const spots = lockPlayers(found);
    if (spots && !this.tracked) {
      this.tracked = spots.map(track);
      this.log.event({ what: "locked" });
    } else if (spots?.length === 2 && this.tracked?.length === 1) {
      const current = follow(this.tracked.map(player => player.spot), found)[0];
      const newcomer = current && found.find(body => body !== current && body.width >= tracking.followWidth * current.width);
      if (newcomer) this.tracked.push(track({ center: newcomer.center, width: newcomer.width }));
    }

    if (found.length !== this.view.detected) this.update({ detected: found.length });
    let players: (Body | null)[] = [];
    const tracked = this.tracked;
    if (tracked) {
      players = follow(
        tracked.map((player) => player.spot),
        found,
      );
      tracked.forEach((player, i) => {
        const body = players[i];
        if (body) {
          player.spot = { center: body.center, width: body.width };
          player.lostAt = null;
        } else {
          player.lostAt ??= now;
        }
      });
      if (tracked.some((player) => player.lostAt !== null && now - player.lostAt > tracking.lostMs)) {
        this.log.event({ what: "lost" });
        this.tracked = null;
        players = [];
      }
    }

    const frames = this.tracked ? this.readPlayers(this.tracked, players, aspect, now, result) : [];
    if (!this.tracked && this.view.locked) this.update({ locked: false, players: [] });
    if (now - this.lightAt >= tracking.lightEveryMs) {
      this.lightAt = now;
      this.checkLight(players, aspect);
    }

    const frame: Frame = { aspect, bodies: found, players: frames, fps: this.fps, timestamp: now, inferenceMs: result.inferenceMs, resultAgeMs, visibility: t.visibility };
    for (const listener of this.frameListeners) listener(frame);
    if (now - this.logAt < tracking.logEveryMs) return;
    this.logAt = now;
    this.log.frame(frames.map((player) => (player ? rounded(player.shown) : null)), {
      fps: Math.round(this.fps), inferenceMs: result.inferenceMs, resultAgeMs, delegate: this.models.delegate, targets: this.targets ?? READINGS,
      raw: frames.map((player) => player ? { levels: rounded(player.raw), shapes: player.shapes ? rounded(player.shapes) : null, baseline: player.baseline, gesture: player.gesture } : null),
    });
  }

  /** Hands, faces, and every reading for the selected players. */
  private readPlayers(tracked: Tracked[], players: (Body | null)[], aspect: number, now: number, result: Inference) {
    const t = this.settings.thresholds;
    const hands = result.hands;
    const handPoints = hands.landmarks.map(hand => toStage(hand, aspect, false));
    const assignments = assignHands(handPoints, players, t);
    const faces = result.face;
    const faceOwners = owners(
      faces.faceLandmarks.map((face) => toStage(face, aspect, false)[FACE_NOSE]),
      players,
      [POSE.nose],
    );

    const views: PlayerView[] = [];
    const frames = tracked.map((player, i): PlayerFrame | null => {
      const body = players[i];
      if (!body) {
        player.steady.clear();
        player.since.clear();
        player.logged.clear();
        views.push(nobody);
        return null;
      }
      const assigned: AssignedHand[] = handPoints.flatMap((points, h) => {
        const assignment = assignments[h];
        if (assignment?.player !== i) return [];
        const category = hands.gestures[h]?.[0];
        return [{ points, wrist: assignment.wrist, gesture: category ? { name: category.categoryName, score: category.score } : null }];
      });
      const gestures = assigned.flatMap(hand => hand.gesture ? [hand.gesture] : []);
      const ownHands = assigned.map(hand => hand.points);
      const openPalms = assigned.filter(hand => hand.gesture?.name === "Open_Palm" && hand.gesture.score >= t.minScore).length;
      // Missing required hands must clear holds immediately, even during hysteresis.
      for (const reading of HAND_READINGS) {
        if (ownHands.length === 0 || (reading === "twoOpenPalms" && openPalms !== 2)) {
          player.steady.delete(reading); player.since.delete(reading); player.logged.delete(reading);
        }
      }
      const shapes = toShapes(faces.faceBlendshapes[faceOwners.indexOf(i)]);
      if (shapes && !player.resting) {
        player.restingFrames.push(shapes);
        if (player.restingFrames.length >= tracking.baselineFrames) player.resting = restingFace(player.restingFrames, t);
      }
      if (!shapes) {
        for (const reading of FACE_READINGS) {
          player.steady.delete(reading);
          player.since.delete(reading);
          player.logged.delete(reading);
        }
      }
      const levels: Levels = {
        ...bodyLevels(body.pose, t),
        ...playerHandLevels(assigned, t),
        ...(shapes ? faceLevels(shapes, player.resting ?? {}, t) : {}),
      };
      views.push({ ...this.settle(player, levels, COLORS[i], now), face: shapes !== null });
      const shown = Object.fromEntries(READINGS.map((reading) => [reading, player.steady.get(reading)?.shown ?? 0]));
      return {
        body,
        raw: levels,
        baseline: player.resting,
        face: faces.faceLandmarks[faceOwners.indexOf(i)] ? toStage(faces.faceLandmarks[faceOwners.indexOf(i)], aspect, false) : null,
        hands: ownHands,
        handWrists: assigned.map(hand => hand.wrist),
        openPalms,
        shown: shown as Record<Reading, number>,
        hold: Object.fromEntries(READINGS.map((reading) => [reading, player.since.has(reading) ? Math.min(1, (now - (player.since.get(reading) ?? now)) / this.settings.holdMs) : 0])) as Record<Reading, number>,
        gesture: [...gestures].sort((a, b) => b.score - a.score)[0] ?? null,
        shapes,
      };
    });

    const changed = !this.view.locked || views.length !== this.view.players.length || views.some((view, i) => {
      const old = this.view.players[i];
      return !old || old.found !== view.found || old.face !== view.face || old.on.join() !== view.on.join() || old.held.join() !== view.held.join();
    });
    if (changed) this.update({ locked: true, players: views });
    return frames;
  }

  /** Smooths each reading, logs what turned on, off, or was held, and says what the player is doing. */
  private settle(player: Tracked, levels: Levels, color: PlayerColor, now: number): Pick<PlayerView, "found" | "on" | "held"> {
    const t = this.settings.thresholds;
    for (const reading of READINGS) {
      const level = this.targets && !this.targets.includes(reading) ? 0 : levels[reading] ?? 0;
      const before = player.steady.get(reading);
      const after = smooth(before, level, t, now);
      player.steady.set(reading, after);
      if (after.on !== Boolean(before?.on)) {
        this.log.event({ what: after.on ? "on" : "off", player: color, reading, detail: level.toFixed(2) });
      }
      const since = heldSince(player.since.get(reading) ?? null, after.on, now);
      if (since === null) {
        player.since.delete(reading);
        player.logged.delete(reading);
      } else {
        player.since.set(reading, since);
        if (now - since >= this.settings.holdMs && !player.logged.has(reading)) {
          player.logged.add(reading);
          this.log.event({ what: "held", player: color, reading });
          if (!this.view.passed.includes(reading)) this.update({ passed: [...this.view.passed, reading] });
        }
      }
    }
    const on = READINGS.filter((reading) => player.steady.get(reading)?.on).sort(
      (a, b) => (player.steady.get(b)?.shown ?? 0) - (player.steady.get(a)?.shown ?? 0),
    );
    const held = on.filter((reading) => now - (player.since.get(reading) ?? now) >= this.settings.holdMs);
    return { found: true, on, held };
  }

  /** Compares the players' brightness with the room's on a tiny copy of the frame. */
  private checkLight(players: readonly (Body | null)[], aspect: number): void {
    this.probe ??= Object.assign(document.createElement("canvas"), { width: 32, height: 18 });
    const context = this.probe.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(this.video, 0, 0, this.probe.width, this.probe.height);
    const { data } = context.getImageData(0, 0, this.probe.width, this.probe.height);
    const boxes = players.flatMap((body) => (body ? [boxOf(body.pose, aspect)] : []));
    const light = lighting(data, this.probe.width, this.probe.height, boxes);
    if (light !== this.view.light) this.update({ light });
  }
}

/** Two decimals is plenty for tuning, and keeps the log small. */
const rounded = (shown: Readonly<Record<string, number>>) =>
  Object.fromEntries(Object.entries(shown).map(([name, value]) => [name, Math.round(value * 100) / 100]));
