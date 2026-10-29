"use client";

import { useEffect, useState } from "react";
import type { BayanContent } from "../content";
import type { BayanSession } from "../session";
import { useNumberToken } from "../useBayan";

/** A big moment when a stage ends. */
export function StageBanner({ session, content }: { session: BayanSession; content: BayanContent }) {
  const [stage, setStage] = useState<number | null>(null);
  const showMs = useNumberToken("--game-stage-banner-ms", 4500);

  useEffect(
    () =>
      session.bus.on((event) => {
        if (event.type === "stage-complete") setStage(event.stage);
      }),
    [session],
  );

  useEffect(() => {
    if (stage === null) return;
    const timer = window.setTimeout(() => setStage(null), showMs);
    return () => window.clearTimeout(timer);
  }, [stage, showMs]);

  if (stage === null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-game-gap">
      <p
        role="status"
        className="animate-rise-in rounded-2xl border-2 border-ink bg-gold px-8 py-5 text-center shadow-game"
      >
        <span className="block text-game-small uppercase tracking-label">Stage {stage} complete</span>
        <span className="pixel block text-game-title lowercase">{content.stages[stage - 1].title}</span>
      </p>
    </div>
  );
}
