"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { GreetContent } from "../content";
import { QuizSession } from "./QuizSession";
import type { GreetStore } from "./store";
import { useGreet } from "./useGreet";

export function useQuizSession(content: GreetContent, store: GreetStore) {
  const resetSerial = useGreet(store, (state) => state.resetSerial);
  const session = useMemo(() => {
    // A teacher reset drops the match being played as well as the saved scores.
    void resetSerial;
    return new QuizSession(
      content,
      () => store.getState().league,
      (group, points) => store.getState().dispatch({ type: "finishMatch", group, points }),
    );
  }, [content, store, resetSerial]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, state };
}
