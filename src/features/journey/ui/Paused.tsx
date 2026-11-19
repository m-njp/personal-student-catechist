import type { JourneyContent } from "../content";
import type { Journey } from "../Journey";

/** Shown while paused. Anywhere on it resumes. */
export function Paused({ journey, content }: { journey: Journey; content: JourneyContent }) {
  return (
    <button type="button" className="journey-paused" onClick={() => journey.togglePause()} aria-label={content.controls.resume}>
      <span className="journey-paused-card">
        <strong className="journey-title-small">{content.paused}</strong>
      </span>
    </button>
  );
}
