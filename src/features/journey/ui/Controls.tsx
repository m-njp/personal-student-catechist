import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import type { JourneyContent } from "../content";
import type { Journey, JourneySnapshot } from "../Journey";

interface ControlsProps {
  journey: Journey;
  snapshot: JourneySnapshot;
  content: JourneyContent;
  fullscreen: { active: boolean; enter: () => void; exit: () => void };
}

function Control({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    // A mouse click never leaves focus here, so Space and Enter keep moving the story on.
    <button type="button" className="journey-control" aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

/** The presenter's buttons, small in the top corner: pause, restart, sound, and full screen. */
export function Controls({ journey, snapshot, content, fullscreen }: ControlsProps) {
  const { controls } = content;
  const playing = snapshot.phase !== "title";
  return (
    <div className="journey-controls">
      {playing && (
        <Control label={snapshot.paused ? controls.resume : controls.pause} onClick={() => journey.togglePause()}>
          {snapshot.paused ? <Play aria-hidden className="journey-icon" /> : <Pause aria-hidden className="journey-icon" />}
        </Control>
      )}
      {playing && (
        <Control label={controls.restart} onClick={() => journey.restart()}>
          <RotateCcw aria-hidden className="journey-icon" />
        </Control>
      )}
      <Control label={snapshot.muted ? controls.unmute : controls.mute} onClick={() => journey.toggleMute()}>
        {snapshot.muted ? <VolumeX aria-hidden className="journey-icon" /> : <Volume2 aria-hidden className="journey-icon" />}
      </Control>
      <Control label={fullscreen.active ? controls.leaveFullscreen : controls.fullscreen} onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}>
        {fullscreen.active ? <Minimize aria-hidden className="journey-icon" /> : <Maximize aria-hidden className="journey-icon" />}
      </Control>
    </div>
  );
}
