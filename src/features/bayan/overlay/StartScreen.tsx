"use client";

import { Maximize, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BayanContent } from "../content";
import type { BayanSession } from "../session";
import { useSaved, useUi } from "../useBayan";
import { ControlsText } from "./ControlsHint";
import { bigButton } from "./styles";

interface StartScreenProps {
  session: BayanSession;
  content: BayanContent;
  fullscreen: { active: boolean; enter: () => void };
}

/** The title card. Start also lets the browser play sound, which it only allows after a tap. */
export function StartScreen({ session, content, fullscreen }: StartScreenProps) {
  const ready = useUi(session, (state) => state.ready);
  const started = useUi(session, (state) => state.started);
  const begun = useSaved(session, (state) => state.progress.openingSeen);
  const start = useRef<HTMLButtonElement>(null);

  // The button is disabled while the save loads, so it takes focus once it is ready: Enter then starts.
  useEffect(() => {
    if (ready && !started) start.current?.focus();
  }, [ready, started]);

  if (started) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink/30 p-game-gap">
      <section className="flex w-full max-w-dialog animate-pop-in flex-col items-start gap-game-gap rounded-2xl border-2 border-ink bg-paper p-game-gap shadow-game">
        <h2 className="pixel text-game-title lowercase">{content.title.title}</h2>
        <p className="text-game">{content.title.body}</p>
        <p className="text-game-small text-muted">
          <ControlsText />
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            ref={start}
            type="button"
            disabled={!ready}
            onClick={() => session.director.start()}
            className={bigButton}
          >
            <Play aria-hidden className="size-5" />
            {!ready ? "Opening our bayan" : begun ? "Continue" : "Start"}
          </button>
          {!fullscreen.active && (
            <button
              type="button"
              onClick={fullscreen.enter}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline px-5 text-game-small hover:bg-wash"
            >
              <Maximize aria-hidden className="size-4" />
              Full screen for the TV
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
