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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const raw = person(0.9).map(point => ({ ...point, z: 0, x: 1 - point.x / (16 / 9) }));
  const result = (request: FrameRequest): Inference => ({
    timestamp: request.timestamp, run: request.run, generation: request.generation, inferenceMs: 12,
    pose: { landmarks: visible ? [raw] : [] }, hands: { landmarks: [], gestures: [] },
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
    for (let i = 0; i < tracking.baselineFrames; i++) await c.step();
    c.smile(0.9); for (let i = 0; i < 12; i++) await c.step();
    expect(c.loop.getSnapshot().players[0].held).toContain("happy");
    c.loop.stop(); expect(c.stop).toHaveBeenCalled(); expect(c.video.srcObject).toBeNull();
    expect(c.loop.getSnapshot().players).toEqual([]);
  });
  it("clears holds on body loss, face loss, and frozen video", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    expect(c.loop.getSnapshot().players[0].held).toContain("happy");
    c.faceVisible(false); await c.step(); expect(c.loop.getSnapshot().players[0].held).toEqual([]);
    c.faceVisible(true); c.visible(false); await c.step(); expect(c.loop.getSnapshot().players[0].found).toBe(false);
    c.visible(true); await c.step(); expect(c.loop.getSnapshot().players[0].held).toEqual([]);
    const count = c.infer.mock.calls.length;
    await c.step(false, tracking.staleMs + 1);
    expect(c.infer).toHaveBeenCalledTimes(count); expect(c.loop.getSnapshot().players[0].found).toBe(false); c.loop.stop();
  });
  it("keeps one capture in flight and rejects old target results", async () => {
    const c = await camera();
    let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); await c.step(); expect(c.infer).toHaveBeenCalledTimes(1);
    c.loop.target(["twoOpenPalms"]);
    deliver(c.result(c.infer.mock.calls[0][0])); await flush();
    expect(c.loop.getSnapshot().players).toEqual([]); c.loop.stop();
  });
  it("ignores results from a previous run and permits a fresh restart", async () => {
    const c = await camera(); let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); const request = c.infer.mock.calls[0][0];
    c.loop.stop(); await c.loop.start(); deliver(c.result(request)); await flush();
    expect(c.loop.getSnapshot().players).toEqual([]);
    await c.step(); expect(c.loop.getSnapshot().players[0].found).toBe(true); c.loop.stop();
  });
  it("discards an observation older than the freshness limit", async () => {
    const c = await camera(); let deliver: (value: Inference) => void = () => {};
    c.infer.mockImplementationOnce(() => new Promise(resolve => { deliver = resolve; }));
    await c.step(); await c.step(false, tracking.staleMs + 1);
    deliver(c.result(c.infer.mock.calls[0][0])); await flush();
    expect(c.loop.getSnapshot().players).toEqual([]); c.loop.stop();
  });
  it("expires delayed observations from capture time, not arrival time", async () => {
    const c = await camera();
    c.infer.mockImplementationOnce(async request => ({ ...c.result(request), timestamp: request.timestamp - 200 }));
    await c.step(); expect(c.loop.getSnapshot().players[0].found).toBe(true);
    await c.step(false, 51); expect(c.loop.getSnapshot().players[0].found).toBe(false);
    await c.step(false, 100); await c.step(); expect(c.loop.getSnapshot().players[0].found).toBe(true); c.loop.stop();
  });
  it("clears held state before notifying observers on relock", async () => {
    const c = await camera(); c.smile(0.9);
    for (let i = 0; i < 12; i++) await c.step();
    const held: number[] = [];
    const off = c.loop.onFrame(() => held.push(c.loop.getSnapshot().players.flatMap(player => player.held).length));
    c.loop.relock(); expect(held).toEqual([0]); off(); c.loop.stop();
  });
  it("releases the camera and exposes retry on worker failure", async () => {
    const c = await camera(); c.infer.mockRejectedValueOnce(new Error("failed")); await c.step();
    expect(c.loop.getSnapshot()).toMatchObject({ status: "error", error: "failed" }); expect(c.stop).toHaveBeenCalled();
  });
});
