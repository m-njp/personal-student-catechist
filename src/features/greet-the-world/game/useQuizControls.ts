"use client";

import { useEffect } from "react";
import { readNumberToken } from "@/lib/tokens";
import type { QuizSession } from "./QuizSession";

export function useQuizControls(session: QuizSession): void {
  useEffect(() => {
    const timer = window.setInterval(() => session.tick(), readNumberToken("--greet-tick-ms"));
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, select, textarea")) return;
      const editable = target?.closest("[contenteditable]");
      if (editable && editable.getAttribute("contenteditable") !== "false") return;
      if (event.key === " " && target?.closest("button")) return;
      const key = event.shiftKey && /^Digit[123]$/.test(event.code) ? event.code.slice(-1) : event.key.toLowerCase();
      if (event.shiftKey && !["t", "f", "1", "2", "3", "y", "n"].includes(key)) return;
      // Plain keys answer for Blue, the same keys with Shift for Orange.
      const player = event.shiftKey ? 1 : 0;
      const phase = session.getSnapshot().phase;
      switch (key) {
        case "t":
          session.answer(true, player);
          break;
        case "f":
          session.answer(false, player);
          break;
        case "1":
        case "2":
        case "3":
          session.answer((Number(key) - 1) as 0 | 1 | 2, player);
          break;
        case "y":
        case "n":
          if (phase === "final" && key === "y") session.finishFinal();
          else session.mark(key === "y", player);
          break;
        case "s":
          session.skip();
          break;
        case "p":
          session.pause();
          break;
        case " ":
          session.next();
          break;
        default: return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.clearInterval(timer); window.removeEventListener("keydown", onKey); };
  }, [session]);
}
