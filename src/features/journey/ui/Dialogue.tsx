import type { CSSProperties } from "react";
import type { JourneyContent } from "../content";
import type { Journey, JourneySnapshot } from "../Journey";
import { MEMORY_COUNT } from "../route";
import type { Rect } from "../render/Atlas";

type SheetInfo = { frames: Record<string, Rect>; width: number; height: number } | null;

interface DialogueProps {
  journey: Journey;
  snapshot: JourneySnapshot;
  content: JourneyContent;
  atlas: SheetInfo;
  portraitSheet: string;
}

/** The head and shoulders of a front facing figure: a square cut from its picture. */
const FACE: Rect = [6, 0, 28, 28];

function Portrait({ atlas, sheet, frame }: { atlas: SheetInfo; sheet: string; frame: string }) {
  const rect = atlas?.frames[frame];
  if (!atlas || !rect) return null;
  const style = {
    backgroundImage: `url(${sheet})`,
    "--sheet-w": atlas.width,
    "--sheet-h": atlas.height,
    "--crop-x": rect[0] + FACE[0],
    "--crop-y": rect[1] + FACE[1],
    "--crop": FACE[2],
  } as CSSProperties;
  return <div aria-hidden className="journey-portrait" style={style} />;
}

/**
 * The memory's name while it replays, then the pupil's question. The class answers aloud, and the
 * presenter reveals the answer.
 */
export function Dialogue({ journey, snapshot, content, atlas, portraitSheet }: DialogueProps) {
  const { phase, memory } = snapshot;
  if (memory < 0 || memory >= MEMORY_COUNT) return null;
  const item = content.memories[memory];
  if (!item) return null;

  if (phase === "replay") {
    return (
      <div className="journey-banner" key={`banner-${memory}`}>
        <span className="journey-banner-lesson">{item.lesson}</span>
        <span className="journey-banner-game">{item.game}</span>
      </div>
    );
  }
  if (phase !== "ask" && phase !== "answer") return null;
  const answered = phase === "answer";
  return (
    <section className="journey-dialogue" key={`ask-${memory}`} aria-live="polite">
      <Portrait atlas={atlas} sheet={portraitSheet} frame={answered ? "pupil-wave-0" : "pupil-idle-0"} />
      <div className="journey-dialogue-text">
        <p className="journey-speaker">
          {content.speaker}
          <span className="journey-speaker-lesson">{item.lesson}</span>
        </p>
        <p className="journey-question">{item.question}</p>
        {answered ? (
          <p className="journey-answer">{item.answer}</p>
        ) : (
          <div className="journey-ask-row">
            <button type="button" className="journey-button" onClick={() => journey.advance()}>
              {content.reveal}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
