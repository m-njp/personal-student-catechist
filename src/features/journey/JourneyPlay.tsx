"use client";

import { useRef, useState } from "react";
import { pixelify } from "./fonts";
import { Journey } from "./Journey";
import type { JourneyActivity } from "./JourneyActivity";
import { useJourney, useJourneyGame, useJourneyKeys } from "./useJourney";
import { Controls } from "./ui/Controls";
import { Dialogue } from "./ui/Dialogue";
import { Paused } from "./ui/Paused";
import { RoadMap } from "./ui/RoadMap";
import { StartScreen } from "./ui/StartScreen";

interface JourneyPlayProps {
  activity: JourneyActivity;
  fullscreen: { active: boolean; enter: () => void; exit: () => void };
}

/** The canvas and everything drawn over it. Loaded only in the browser (see JourneyView). */
export function JourneyPlay({ activity, fullscreen }: JourneyPlayProps) {
  const [journey] = useState(() => new Journey());
  const canvas = useRef<HTMLCanvasElement>(null);
  const snapshot = useJourney(journey);
  const { atlas, error } = useJourneyGame(journey, activity, canvas);
  useJourneyKeys(journey);
  const { content } = activity;

  return (
    <div className={`journey-shell ${pixelify.variable}`}>
      <canvas ref={canvas} className="journey-canvas" onClick={() => journey.advance()} aria-label={content.title} />
      {error && <p className="journey-error">{error}</p>}
      {snapshot.phase !== "title" && <RoadMap journey={journey} snapshot={snapshot} content={content} />}
      <Controls journey={journey} snapshot={snapshot} content={content} fullscreen={fullscreen} />
      <Dialogue journey={journey} snapshot={snapshot} content={content} atlas={atlas} portraitSheet={`${activity.art}/atlas.png`} />
      {snapshot.phase === "title" && <StartScreen journey={journey} content={content} fullscreen={fullscreen} ready={atlas !== null} />}
      {snapshot.paused && <Paused journey={journey} content={content} />}
    </div>
  );
}
