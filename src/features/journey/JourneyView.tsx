"use client";

import dynamic from "next/dynamic";
import type { ActivityViewProps } from "@/core/activity/ActivityRegistry";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { JourneyActivity } from "./JourneyActivity";

// The canvas and sound need the browser, so the game never renders on the server.
const JourneyPlay = dynamic(() => import("./JourneyPlay").then((module) => module.JourneyPlay), {
  ssr: false,
  loading: () => <p className="absolute inset-0 flex items-center justify-center text-muted">Loading the journey</p>,
});

/** A Journey to Remember fills the screen, with a full screen mode for the TV. */
export function JourneyView({ activity }: ActivityViewProps<JourneyActivity>) {
  const fullscreen = useFullscreen();
  const floating = fullscreen.active;

  return (
    <div className={floating ? "fixed inset-0 z-50 bg-journey-night" : "flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 lg:px-10 lg:pb-6"}>
      <div className={`relative min-h-0 flex-1 overflow-hidden ${floating ? "size-full" : "rounded-2xl border border-hairline"}`}>
        <JourneyPlay activity={activity} fullscreen={fullscreen} />
      </div>
    </div>
  );
}
