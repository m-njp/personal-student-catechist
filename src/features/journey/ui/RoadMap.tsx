import { Church } from "lucide-react";
import type { JourneyContent } from "../content";
import type { Journey, JourneySnapshot } from "../Journey";
import { MEMORY_COUNT } from "../route";

interface RoadMapProps {
  journey: Journey;
  snapshot: JourneySnapshot;
  content: JourneyContent;
}

/** The stops along the road: where the class is now, and a way to jump to any of them. */
export function RoadMap({ journey, snapshot, content }: RoadMapProps) {
  const stops = Array.from({ length: MEMORY_COUNT + 1 }, (_, i) => i);
  return (
    <nav className="journey-roadmap" aria-label={content.controls.jumpTo}>
      {stops.map((i) => {
        const church = i === MEMORY_COUNT;
        const label = church ? content.controls.church : content.controls.memory.replace("{n}", String(i + 1));
        const state = snapshot.memory === i && snapshot.phase !== "walk" ? "here" : snapshot.memory >= i ? "done" : "ahead";
        return (
          <button
            key={i}
            type="button"
            className="journey-stop"
            data-state={state}
            aria-label={`${content.controls.jumpTo} ${label}`}
            aria-current={state === "here" ? "step" : undefined}
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => journey.jump(i)}
          >
            {church ? <Church aria-hidden className="journey-icon" /> : i + 1}
          </button>
        );
      })}
    </nav>
  );
}
