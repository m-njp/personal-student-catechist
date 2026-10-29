"use client";

import { useStore } from "zustand";
import type { GreetState, GreetStore } from "./store";

/** Part of the game's state. Re-renders only when the picked part changes. */
export function useGreet<T>(store: GreetStore, pick: (state: GreetState) => T): T {
  return useStore(store, pick);
}
