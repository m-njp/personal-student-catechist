"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { readNumberToken, readToken } from "@/lib/tokens";
import { pixelify } from "./fonts";
import type { Journey, JourneySnapshot } from "./Journey";
import type { JourneyActivity } from "./JourneyActivity";
import { MEMORY_COUNT, type QuestId, type SoundName } from "./route";
import { loadAtlas, type Rect } from "./render/Atlas";
import { Renderer } from "./render/Renderer";
import { Sound } from "./Sound";

export function useJourney(journey: Journey): JourneySnapshot {
  return useSyncExternalStore(journey.subscribe, journey.getSnapshot, journey.getSnapshot);
}

/** The longest step a frame may take, so a hidden tab does not make the pupil jump ahead. */
const MAX_FRAME_MS = 50;
const CHIRP_EVERY_MS = 7000;

/** Quieter sounds for things that happen often. */
const CUE_VOLUME: Partial<Record<SoundName, number>> = { brick: 0.35, hammer: 0.4, rise: 0.5, firework: 0.45, bell: 0.6 };

/** What each side quest sounds like. */
const QUEST_SOUNDS: Record<QuestId, readonly [SoundName, number][]> = {
  lola: [["cluck", 0.4]],
  ball: [["bounce", 0.45]],
  jeepney: [["engine", 0.45], ["horn", 0.5]],
  dog: [["bark", 0.5]],
  garland: [["sparkle", 0.5]],
};

/**
 * Loads the pictures and sounds, then draws every frame and plays each sound the rules ask for.
 * Returns the atlas's frames once loaded, for the pupil's portrait, or an error to show.
 */
export function useJourneyGame(journey: Journey, activity: JourneyActivity, canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [frames, setFrames] = useState<{ frames: Record<string, Rect>; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let frame = 0;
    let renderer: Renderer | null = null;
    let atlasDispose: (() => void) | null = null;
    const sound = new Sound(activity.sounds);

    const stopEvents = journey.on((event) => {
      switch (event.type) {
        case "start":
          sound.wake();
          sound.playLoop("music", 0.4);
          break;
        case "step":
          sound.play(event.foot === 0 ? "step-0" : "step-1", 0.3);
          break;
        case "arrive":
          sound.play("whoosh", 0.5);
          sound.play("memory", 0.5);
          break;
        case "ask":
          sound.play("ask", 0.5);
          break;
        case "reveal":
          sound.play("reveal", 0.8);
          sound.play("fanfare", 0.55);
          sound.play("cheer", 0.4);
          break;
        case "cue":
          sound.play(event.sound, CUE_VOLUME[event.sound] ?? 0.55);
          break;
        case "quest":
          for (const [name, volume] of QUEST_SOUNDS[event.id]) sound.play(name, volume);
          break;
        case "church":
          sound.stopLoop();
          sound.play("ending", 0.7);
          break;
        case "jump":
          sound.wake();
          if (journey.memoryIndex < MEMORY_COUNT) sound.playLoop("music", 0.4);
          break;
        case "restart":
          sound.stopLoop();
          break;
        case "mute":
          sound.setMuted(event.muted);
          break;
        case "pause":
          sound.setPaused(event.paused);
          break;
        default:
          break;
      }
    });

    const observer = new ResizeObserver(() => {
      renderer?.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    });

    void (async () => {
      try {
        const [atlas] = await Promise.all([
          loadAtlas(activity.art),
          document.fonts.load(`600 12px ${pixelify.style.fontFamily}`).catch(() => []),
        ]);
        if (!alive) {
          atlas.dispose();
          return;
        }
        atlasDispose = () => atlas.dispose();
        renderer = new Renderer(
          canvas,
          atlas,
          journey,
          activity.content,
          pixelify.style.fontFamily,
          {
            bubble: readToken("--journey-bubble"),
            bubbleInk: readToken("--journey-bubble-ink"),
            signInk: readToken("--journey-sign-ink"),
            night: readToken("--color-journey-night"),
            flash: readToken("--journey-flash"),
            warm: readToken("--journey-warm"),
            bubbleSize: readNumberToken("--journey-bubble-size"),
            signSize: readNumberToken("--journey-sign-size"),
          },
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
        observer.observe(canvas);
        setFrames({ frames: atlas.data.frames, width: atlas.image.naturalWidth, height: atlas.image.naturalHeight });
        let last = performance.now();
        let chirpAt = 0;
        const loop = (now: number) => {
          const dt = Math.min(MAX_FRAME_MS, now - last);
          last = now;
          journey.tick(dt);
          renderer?.draw(dt);
          // Birds sing now and then along the road.
          if (journey.current === "walk" && journey.clock - chirpAt > CHIRP_EVERY_MS) {
            chirpAt = journey.clock;
            sound.play("chirp", 0.3);
          }
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : "The journey did not load.");
      }
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      stopEvents();
      renderer?.dispose();
      sound.dispose();
      atlasDispose?.();
      // Free the canvas's pixels; a 1080p canvas holds about 8 MB.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [journey, activity, canvasRef]);

  return { atlas: frames, error };
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** The presenter's keys: Space or Enter moves on, P pauses, R restarts, M mutes, 1 to 5 jump. */
export function useJourneyKeys(journey: Journey) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "enter") {
        // A focused button answers Space and Enter itself.
        if (target?.closest("button")) return;
        event.preventDefault();
        journey.advance();
      } else if (key === "p") {
        journey.togglePause();
      } else if (key === "r") {
        journey.restart();
      } else if (key === "m") {
        journey.toggleMute();
      } else if (/^[1-5]$/.test(key)) {
        journey.jump(Number(key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [journey]);
}
