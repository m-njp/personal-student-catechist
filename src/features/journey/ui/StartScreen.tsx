import type { JourneyContent } from "../content";
import type { Journey } from "../Journey";

interface StartScreenProps {
  journey: Journey;
  content: JourneyContent;
  fullscreen: { active: boolean; enter: () => void };
  ready: boolean;
}

/** The title card. Start fills the screen for the TV and lets the browser play sound. */
export function StartScreen({ journey, content, fullscreen, ready }: StartScreenProps) {
  const start = () => {
    if (!fullscreen.active) fullscreen.enter();
    journey.advance();
  };
  return (
    <div className="journey-start">
      <div className="journey-start-card">
        <h2 className="journey-title">{content.title}</h2>
        <p className="journey-tagline">{content.tagline}</p>
        {ready ? (
          <button type="button" className="journey-button journey-button-big" onClick={start}>
            {content.start}
          </button>
        ) : (
          <p className="journey-tagline">Loading the journey</p>
        )}
      </div>
    </div>
  );
}
