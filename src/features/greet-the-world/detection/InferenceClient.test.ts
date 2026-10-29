import { afterEach, describe, expect, it, vi } from "vitest";
import { InferenceClient } from "./InferenceClient";
import type { FrameRequest, WorkerResponse } from "./protocol";
import { tracking } from "./config";
afterEach(() => vi.useRealTimers());
function client() {
  const worker = { onmessage: null as ((event: MessageEvent<WorkerResponse>) => void) | null, onerror: null as (() => void) | null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() };
  const make = vi.fn(() => worker as unknown as Worker);
  const instance = new InferenceClient(make);
  const deliver = (data: WorkerResponse) => worker.onmessage?.({ data } as MessageEvent<WorkerResponse>);
  return { instance, worker, make, deliver };
}
const frame = (): FrameRequest => ({ type: "frame", image: { close: vi.fn() } as unknown as ImageBitmap, timestamp: 100, run: 1, generation: 0, hands: true, face: false });
describe("worker transport", () => {
  it("transfers one frame and refuses a second while busy", async () => {
    const c = client(); const ready = c.instance.initialize("/models"); c.deliver({ type: "ready", delegate: "CPU" }); await ready;
    const request = frame(); const first = c.instance.infer(request); const second = frame();
    await expect(c.instance.infer(second)).rejects.toThrow("busy"); expect(second.image.close).toHaveBeenCalledOnce();
    expect(c.worker.postMessage).toHaveBeenLastCalledWith(request, [request.image]);
    c.deliver({ type: "result", result: { timestamp: 100, run: 1, generation: 0, inferenceMs: 10, pose: { landmarks: [] }, hands: { landmarks: [], gestures: [] }, face: { faceLandmarks: [], faceBlendshapes: [] } } });
    await expect(first).resolves.toMatchObject({ timestamp: 100 }); expect(c.instance.busy).toBe(false); c.instance.close();
  });
  it("rejects pending initialization on unmount", async () => {
    const c = client(); const ready = c.instance.initialize("/models"); const rejected = expect(ready).rejects.toThrow("closed");
    c.instance.close(); await rejected; expect(c.worker.terminate).toHaveBeenCalledOnce();
  });
  it("times out stuck inference and can initialize a fresh worker", async () => {
    vi.useFakeTimers(); const c = client(); const ready = c.instance.initialize("/models"); c.deliver({ type: "ready", delegate: "GPU" }); await ready;
    const pending = c.instance.infer(frame()); const rejected = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(tracking.workerTimeoutMs); await rejected;
    expect(c.worker.terminate).toHaveBeenCalledOnce();
    const restarted = c.instance.initialize(); c.deliver({ type: "ready", delegate: "CPU" }); await restarted;
    expect(c.make).toHaveBeenCalledTimes(2); c.instance.close();
  });
  it("reports worker failure and releases the worker", async () => {
    const c = client(); const ready = c.instance.initialize("/models"); c.deliver({ type: "ready", delegate: "GPU" }); await ready;
    const pending = c.instance.infer(frame()); const rejected = expect(pending).rejects.toThrow("failed");
    c.worker.onerror?.(); await rejected; expect(c.worker.terminate).toHaveBeenCalledOnce();
  });
});
