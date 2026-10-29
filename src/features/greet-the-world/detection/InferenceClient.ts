import { tracking } from "./config";
import type { FrameRequest, Inference, WorkerRequest, WorkerResponse } from "./protocol";

type Pending = { resolve: (result: Inference) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

/** One worker and one in-flight frame. The camera owns capture; this class owns transport. */
export class InferenceClient {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private failLoading: ((error: Error) => void) | null = null;
  private base = "";
  private ready: Promise<"GPU" | "CPU"> | null = null;
  constructor(private readonly makeWorker: () => Worker) {}

  initialize(base = this.base, step: (index: number) => void = () => {}): Promise<"GPU" | "CPU"> {
    if (this.ready) return this.ready;
    this.base = base;
    const worker = this.makeWorker();
    this.worker = worker;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error("Model loading timed out")), 60000);
      this.failLoading = error => { clearTimeout(timer); reject(error); };
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (this.worker !== worker) return;
        if (data.type === "step") step(data.step);
        if (data.type === "ready") { clearTimeout(timer); this.failLoading = null; resolve(data.delegate); }
        if (data.type === "error") this.fail(new Error(data.message));
        if (data.type === "result" && this.pending) {
          const pending = this.pending;
          this.pending = null;
          clearTimeout(pending.timer);
          pending.resolve(data.result);
        }
      };
      worker.onerror = () => this.fail(new Error("Camera worker failed"));
      worker.onmessageerror = () => this.fail(new Error("Camera worker message failed"));
      this.post({ type: "init", base });
    });
    return this.ready;
  }

  infer(request: FrameRequest): Promise<Inference> {
    if (!this.worker || this.pending) {
      request.image.close();
      return Promise.reject(new Error("Camera worker is unavailable or busy"));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error("Camera inference timed out")), tracking.workerTimeoutMs);
      this.pending = { resolve, reject, timer };
      try { this.post(request, [request.image]); }
      catch (error) { request.image.close(); this.fail(error instanceof Error ? error : new Error("Frame transfer failed")); }
    });
  }

  get busy(): boolean { return this.pending !== null; }
  close(): void { this.fail(new Error("Camera worker closed")); }
  private post(message: WorkerRequest, transfer: Transferable[] = []): void { this.worker?.postMessage(message, transfer); }
  private fail(error: Error): void {
    this.failLoading?.(error);
    this.failLoading = null;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
    if (this.worker) {
      this.post({ type: "close" });
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = null;
  }
}
