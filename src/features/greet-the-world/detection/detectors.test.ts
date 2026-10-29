import { afterEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ pose: vi.fn(), gesture: vi.fn(), face: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  PoseLandmarker: { createFromOptions: fake.pose, POSE_CONNECTIONS: [] },
  GestureRecognizer: { createFromOptions: fake.gesture, HAND_CONNECTIONS: [] },
  FaceLandmarker: { createFromOptions: fake.face, FACE_LANDMARKS_FACE_OVAL: [], FACE_LANDMARKS_LIPS: [] }, DrawingUtils: class {},
}));
import { closeDetectors, loadDetectors } from "./detectors";
afterEach(() => vi.resetAllMocks());
describe("worker model lifecycle", () => {
  it("falls back to CPU and closes all loaded models", async () => {
    const pose = { close: vi.fn() }, gesture = { close: vi.fn() }, face = { close: vi.fn() };
    fake.pose.mockRejectedValueOnce(new Error("GPU unavailable")).mockResolvedValueOnce(pose);
    fake.gesture.mockResolvedValue(gesture); fake.face.mockResolvedValue(face);
    const models = await loadDetectors("https://example.test/models", vi.fn(), async () => ({ default: vi.fn() }));
    expect(fake.pose.mock.calls.map(call => call[1].baseOptions.delegate)).toEqual(["GPU", "CPU"]);
    expect(models.delegate).toBe("CPU"); closeDetectors(models);
    for (const model of [pose, gesture, face]) expect(model.close).toHaveBeenCalledOnce();
  });
  it("closes earlier models if a later model fails on both delegates", async () => {
    const pose = { close: vi.fn() }; fake.pose.mockResolvedValue(pose); fake.gesture.mockRejectedValue(new Error("unavailable"));
    await expect(loadDetectors("/models", vi.fn(), async () => ({ default: vi.fn() }))).rejects.toThrow("unavailable"); expect(pose.close).toHaveBeenCalledOnce();
  });
});
