// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraLoop } from "./CameraLoop";
import { defaultThresholds, tracking } from "./config";
import { DetectionLog } from "./DetectionLog";
import type { Models } from "./models";
import type { FrameRequest, Inference } from "./protocol";
import { person } from "./samplePoses";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function camera() {
  let time = 0, serial = 0;
  let visible = true, faceVisible = true, smile = 0;
  let people: ReturnType<typeof person>[] | null = null;
  let color = [150, 70, 40, 255];
  const callbacks = new Map<number, FrameRequestCallback>();
  const stop = vi.fn();
  const video = document.createElement("video");
  Object.defineProperties(video, { readyState: { value: 4 }, videoWidth: { value: 1280 }, videoHeight: { value: 720 } });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  video.play = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(performance, "now").mockImplementation(() => time);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => { callbacks.set(++serial, next); return serial; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: Uint8ClampedArray.from({ length: 160 * 90 * 4 }, (_, i) => color[i % 4]) }),
  } as unknown as CanvasRenderingContext2D);
  const raw = person(0.9).map(point => ({ ...point, z: 0, x: 1 - point.x / (16 / 9) }));
  const result = (request: FrameRequest): Inference => ({
    timestamp: request.timestamp, run: request.run, generation: request.generation, inferenceMs: 12,
    pose: { landmarks: visible ? people ? people.map(pose => pose.map(point => ({ ...point, z: 0, x: 1 - point.x / (16 / 9) }))) : [raw] : [] }, hands: { landmarks: [], gestures: [] },
    face: { faceLandmarks: request.face && faceVisible ? [[raw[0], raw[0]]] : [],
      faceBlendshapes: request.face && faceVisible ? [{ categories: [
        { categoryName: "mouthSmileLeft", score: smile, index: 0, displayName: "" },
        { categoryName: "mouthSmileRight", score: smile, index: 1, displayName: "" },
      ], headIndex: 0, headName: "" }] : [] },
  });
  const infer = vi.fn(async (request: FrameRequest) => result(request));
  const models = { client: { initialize: vi.fn().mockResolvedValue("CPU"), infer, busy: false }, delegate: "CPU" } as unknown as Models;
  const loop = new CameraLoop(models, video, new DetectionLog(), { thresholds: defaultThresholds, holdMs: 500 });
  await loop.start();
  return { loop, stop, infer, video, result,
    people: (value: ReturnType<typeof person>[] | null) => { people = value; },
    color: (value: number[]) => { color = value; },
    visible: (value: boolean) => { visible = value; },
    faceVisible: (value: boolean) => { faceVisible = value; },
    smile: (value: number) => { smile = value; },
    step: async (newFrame = true, elapsed = 100) => {
      time += elapsed;
      if (newFrame) video.currentTime = time / 1000;
      const batch = [...callbacks.values()]; callbacks.clear();
      batch.forEach(callback => callback(time));
      await flush();
    },
  };
}
describe("worker camera loop", () => {
  it("requests only models needed by the current signs", async () => {
    const c = await camera(); c.loop.target(["handsOnHead"]); await c.step();
    expect(c.infer.mock.calls[0][0]).toMatchObject({ hands: false, face: false });
    c.loop.target(["happy"]); await c.step();
    expect(c.infer.mock.calls[1][0]).toMatchObject({ hands: false, face: true });
    c.loop.target(["twoOpenPalms"]); await c.step();
    expect(c.infer.mock.calls[2][0]).toMatchObject({ hands: true, face: false }); c.loop.stop();
  });
  it("reads a lone face, calibrates it, and releases camera resources", async () => {
    const c = await camera(); c.smile(0.1);
    for (let i = 0; i < tracking.baselineFrames + 4; i++) await c.step();
    c.smile(0.9); for (let i = 0; i < 12; i++) await c.step();
    expect(c.loop.getSnapshot().player!.held).toContain("happy");
    c.loop.stop(); expect(c.stop).toHaveBeenCalled(); expect(c.video.srcObject).toBeNull();
    expect(c.loop.getSnapshot().player).toBeNull();
  });
  it("clears holds on body loss, face loss, and frozen video", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    expect(c.loop.getSnapshot().player!.held).toContain("happy");
    c.faceVisible(false); await c.step(); expect(c.loop.getSnapshot().player!.held).toEqual([]);
    c.faceVisible(true); c.visible(false); await c.step(); expect(c.loop.getSnapshot().player!.found).toBe(false);
    c.visible(true); await c.step(); expect(c.loop.getSnapshot().player!.held).toEqual([]);
    const count = c.infer.mock.calls.length;
    await c.step(false, tracking.staleMs + 1);
    expect(c.infer).toHaveBeenCalledTimes(count); expect(c.loop.getSnapshot().player!.found).toBe(false); c.loop.stop();
  });
  it("keeps one capture in flight and rejects old target results", async () => {
    const c = await camera();
    let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); await c.step(); expect(c.infer).toHaveBeenCalledTimes(1);
    c.loop.target(["twoOpenPalms"]);
    deliver(c.result(c.infer.mock.calls[0][0])); await flush();
    expect(c.loop.getSnapshot().player).toBeNull(); c.loop.stop();
  });
  it("ignores results from a previous run and permits a fresh restart", async () => {
    const c = await camera(); let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); const request = c.infer.mock.calls[0][0];
    c.loop.stop(); await c.loop.start(); deliver(c.result(request)); await flush();
    expect(c.loop.getSnapshot().player).toBeNull();
    for (let i = 0; i < 4; i++) await c.step(); expect(c.loop.getSnapshot().player!.found).toBe(true); c.loop.stop();
  });
  it("discards an observation older than the freshness limit", async () => {
    const c = await camera(); let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); await c.step(false, tracking.staleMs + 1);
    deliver(c.result(c.infer.mock.calls[0][0])); await flush();
    expect(c.loop.getSnapshot().player).toBeNull(); c.loop.stop();
  });
  it("expires delayed observations from capture time, not arrival time", async () => {
    const c = await camera();
    for (let i = 0; i < 4; i++) await c.step();
    let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); const request = c.infer.mock.calls.at(-1)![0];
    await c.step(false, 200); deliver(c.result(request)); await flush();
    expect(c.loop.getSnapshot().player!.found).toBe(true);
    await c.step(false, tracking.staleMs - 199); expect(c.loop.getSnapshot().player!.found).toBe(false);
    await c.step(false, 100); for (let i = 0; i < 4; i++) await c.step(); expect(c.loop.getSnapshot().player!.found).toBe(true); c.loop.stop();
  });
  it("clears held state before notifying observers on relock", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    const held: number[] = [];
    const off = c.loop.onFrame(() => held.push(c.loop.getSnapshot().player?.held.length ?? 0));
    c.loop.relock(); expect(held).toEqual([0]); off(); c.loop.stop();
  });
  it("releases the camera and exposes retry on worker failure", async () => {
    const c = await camera(); c.infer.mockRejectedValueOnce(new Error("failed")); await c.step();
    expect(c.loop.getSnapshot()).toMatchObject({ status: "error", error: "failed" }); expect(c.stop).toHaveBeenCalled();
  });
  it("keeps the same lock after a long absence, rejects a different shirt, and recovers automatically", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    expect(c.loop.getSnapshot().player!.held).toContain("happy");
    c.visible(false); await c.step();
    await c.step(true, 5000);
    expect(c.loop.getSnapshot()).toMatchObject({ locked: true, player: { found: false, held: [] }, guidance: "return" });
    c.visible(true); c.color([20, 40, 220, 255]);
    for (let i = 0; i < 8; i++) await c.step();
    expect(c.loop.getSnapshot().player!.found).toBe(false);
    c.color([150, 70, 40, 255]);
    for (let i = 0; i < 4; i++) await c.step();
    expect(c.loop.getSnapshot()).toMatchObject({ locked: true, player: { found: true, held: [] }, guidance: null });
    for (let i = 0; i < 7; i++) await c.step();
    expect(c.loop.getSnapshot().player!.held).toContain("happy"); c.loop.stop();
  });
  it("never enrolls a second person and relock clears face calibration and setup progress", async () => {
    const c = await camera(); c.smile(0.1);
    for (let i = 0; i < 20; i++) await c.step();
    c.people([person(0.9), person(1.5)]); await c.step();
    expect(c.loop.getSnapshot().detected).toBe(2);
    expect(c.loop.getSnapshot().player!.found).toBe(true);
    const frames: (import("./CameraLoop").PlayerFrame | null)[] = [];
    c.loop.onFrame(frame => frames.push(frame.player));
    c.loop.relock(); expect(c.loop.getSnapshot()).toMatchObject({ locked: false, player: null, passed: [] });
    for (let i = 0; i < 4; i++) await c.step();
    expect(frames.at(-1)?.baseline).toBeNull(); c.loop.stop();
  });
  it("publishes cleared holds to frame observers before a frozen frame can answer", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    const seen: boolean[] = [];
    c.loop.onFrame(() => seen.push(Boolean(c.loop.getSnapshot().player?.held.length)));
    await c.step(false, tracking.staleMs + 1);
    expect(seen).toEqual([false]); c.loop.stop();
  });

  it("accepts newer fresh results while older displayed readings expire during slow inference", async () => {
    const c = await camera(); c.smile(0.9); c.loop.target(["happy"]);
    const pending: { request: FrameRequest; resolve: (value: Inference) => void }[] = [];
    c.infer.mockImplementation(request => new Promise(resolve => pending.push({ request, resolve })));
    const held: boolean[] = [];
    c.loop.onFrame(frame => { if (frame.inferenceMs) held.push(Boolean(c.loop.getSnapshot().player?.held.includes("happy"))); });
    for (let at = 50; at <= 3000; at += 50) {
      await c.step(true, 50);
      const ready = pending[0];
      if (ready && at - ready.request.timestamp >= 200) {
        pending.shift(); ready.resolve(c.result(ready.request)); await flush();
      }
    }
    expect(held.length).toBeGreaterThanOrEqual(10);
    expect(held).toContain(true);
    c.loop.stop(); for (const each of pending) each.resolve(c.result(each.request)); await flush();
  });
  it("finds the player on a laptop whose readings take 400 ms", async () => {
    const c = await camera();
    const pending: { request: FrameRequest; resolve: (value: Inference) => void }[] = [];
    c.infer.mockImplementation(request => new Promise(resolve => pending.push({ request, resolve })));
    for (let at = 50; at <= 3000 && !c.loop.getSnapshot().player?.found; at += 50) {
      await c.step(true, 50);
      const ready = pending[0];
      if (ready && at - ready.request.timestamp >= 400) {
        pending.shift(); ready.resolve(c.result(ready.request)); await flush();
      }
    }
    expect(c.loop.getSnapshot()).toMatchObject({ locked: true, player: { found: true } });
    c.loop.stop(); for (const each of pending) each.resolve(c.result(each.request)); await flush();
  });
});
