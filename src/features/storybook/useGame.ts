"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import type { Saved } from "./savedStore";
import type { StoryGame } from "./StoryGame";

/** Part of a game's saved state. Re-renders only when the picked part changes. */
export function useSaved<TProgress, TAction, TOutcome, T>(
  game: StoryGame<TProgress, TAction, TOutcome>,
  pick: (state: Saved<TProgress>) => T,
): T {
  return useStore(game.store, pick);
}

/** False until the save has been read, so the class never sees the first scene flash before their own. */
export function useHydrated<TProgress, TAction, TOutcome>(game: StoryGame<TProgress, TAction, TOutcome>): boolean {
  const { persist } = game.store;
  return useSyncExternalStore(persist.onFinishHydration, persist.hasHydrated, () => false);
}

/** Whether the last change reached the server, for the teacher panel. */
export function useSaveStatus<TProgress, TAction, TOutcome>(game: StoryGame<TProgress, TAction, TOutcome>) {
  useEffect(() => {
    const flush = () => game.sync.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [game]);
  return useSyncExternalStore(game.sync.subscribe, game.sync.getSnapshot, () => "loading" as const);
}
