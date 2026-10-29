"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CameraLoop, type CameraSettings, type CameraView } from "./CameraLoop";
import type { DetectionLog } from "./DetectionLog";
import { closeModels, loadModels, type Models } from "./models";

type ModelState = { models: Models | null; step: number; failed: boolean };

/**
 * The three models, loaded once `wanted` is true and closed when the game closes. The effect that
 * loads them owns them, so they are closed exactly once. `retry` loads them again after a failure.
 */
export function useModels(base: string, wanted: boolean) {
  const [state, setState] = useState<ModelState>({ models: null, step: 0, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!wanted) return;
    let active = true;
    const controller = new AbortController();
    let loaded: Models | null = null;
    loadModels(base, (step) => {
      if (active) setState({ models: null, step, failed: false });
    }, controller.signal).then(
      (models) => {
        // The game closed while they loaded.
        if (!active) return closeModels(models);
        loaded = models;
        setState({ models, step: 2, failed: false });
      },
      () => {
        if (active) setState({ models: null, step: 0, failed: true });
      },
    );
    return () => {
      active = false;
      controller.abort();
      if (loaded) closeModels(loaded);
    };
  }, [base, wanted, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

/**
 * The camera loop for one video element. The camera opens when both are ready and closes when the
 * element leaves the page, so moving between screens never leaves the camera on.
 */
export function useCamera(models: Models | null, video: HTMLVideoElement | null, log: DetectionLog, settings: CameraSettings) {
  // Made without side effects; the effect below opens and closes the camera.
  const loop = useMemo(
    () => (models && video ? new CameraLoop(models, video, log, settings) : null),
    // Settings change often and are passed on below, so they do not make a new loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models, video, log],
  );

  useEffect(() => {
    if (!loop) return;
    void loop.start();
    return () => loop.stop();
  }, [loop]);

  useEffect(() => {
    loop?.configure(settings);
  }, [loop, settings]);

  return loop;
}

const noView = () => null;
const noSubscribe = () => () => {};

/** What the loop shows: the camera's state, the players, and their readings. Null before it starts. */
export function useCameraView(loop: CameraLoop | null): CameraView | null {
  return useSyncExternalStore(loop?.subscribe ?? noSubscribe, loop?.getSnapshot ?? noView, noView);
}

/** Everything a screen with the camera needs: the loop, what it shows, and the ref for its video. No loop without models. */
export function useLiveCamera(models: Models | null, log: DetectionLog, settings: CameraSettings) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const loop = useCamera(models, video, log, settings);
  return { loop, view: useCameraView(loop), onVideo: setVideo };
}
