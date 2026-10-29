import { closeDetectors, loadDetectors, type Detectors } from "./detectors";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
  close: () => void;
};
let detectors: Detectors | null = null;
let closing = false;
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === "close") {
      closing = true;
      if (detectors) closeDetectors(detectors);
      detectors = null;
      scope.close();
    } else if (data.type === "init") {
      const loaded = await loadDetectors(data.base, step => scope.postMessage({ type: "step", step }));
      if (closing) { closeDetectors(loaded); return; }
      detectors = loaded;
      scope.postMessage({ type: "ready", delegate: loaded.delegate });
    } else {
      try {
        if (!detectors) throw new Error("Detector is not ready");
        const start = performance.now();
        const pose = detectors.pose.detectForVideo(data.image, data.timestamp);
        const hands = data.hands ? detectors.gesture.recognizeForVideo(data.image, data.timestamp) : { landmarks: [], gestures: [] };
        const face = data.face ? detectors.face.detectForVideo(data.image, data.timestamp) : { faceLandmarks: [], faceBlendshapes: [] };
        scope.postMessage({ type: "result", result: {
          timestamp: data.timestamp, run: data.run, generation: data.generation,
          pose: { landmarks: pose.landmarks }, hands: { landmarks: hands.landmarks, gestures: hands.gestures },
          face: { faceLandmarks: face.faceLandmarks, faceBlendshapes: face.faceBlendshapes }, inferenceMs: performance.now() - start,
        } });
      } finally { data.image.close(); }
    }
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : "Inference failed" });
  }
};
