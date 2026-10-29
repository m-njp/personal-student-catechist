"use client";

import { useEffect, useRef } from "react";
import { readNumberToken } from "@/lib/tokens";

/** The background loop: plays while `playing`, quietly under the room, and is released when the game closes. */
export function useMusic(src: string, playing: boolean): void {
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loop = new Audio(src);
    loop.loop = true;
    loop.preload = "auto";
    loop.volume = readNumberToken("--greet-music-volume");
    audio.current = loop;
    return () => {
      loop.pause();
      loop.removeAttribute("src");
      loop.load();
      audio.current = null;
    };
  }, [src]);

  useEffect(() => {
    const loop = audio.current;
    if (!loop) return;
    if (!playing) return loop.pause();
    loop.play().catch(() => {
      // The browser blocks sound until the page is tapped once; the game works without it.
    });
  }, [playing]);
}
