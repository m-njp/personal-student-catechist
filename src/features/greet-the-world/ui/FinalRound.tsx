import { GlobeHemisphereEastIcon } from "@phosphor-icons/react";
import type { GreetContent } from "../content";

interface FinalRoundProps { content: GreetContent; finalPlayers: readonly [boolean, boolean] }
function arc(from: number, to: number): string {
  const point = (turn: number, radius: number) => {
    const angle = turn * 2 * Math.PI - Math.PI / 2;
    return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)].join(" ");
  };
  return "M " + point(from, 48) + " A 48 48 0 0 1 " + point(to, 48) + " L " + point(to, 36) + " A 36 36 0 0 0 " + point(from, 36) + " Z";
}

/** Fixed halves belong to Player 1 and Player 2, even when one steps away. */
export function FinalRound({ content, finalPlayers }: FinalRoundProps) {
  return <section className="greet-card greet-final" aria-live="polite">
    <span className="greet-eyebrow">{content.quiz.final}</span>
    <h2 className="greet-question">{content.lines.final}</h2>
    <div className="greet-globe" data-done={finalPlayers.every(Boolean)}>
      <svg viewBox="0 0 100 100" aria-hidden className="greet-globe-ring">
        {finalPlayers.map((ready, i) => <path key={i} d={arc(i / 2 + 0.01, (i + 1) / 2 - 0.01)} data-player={i} data-lit={ready} />)}
      </svg>
      <GlobeHemisphereEastIcon aria-hidden weight="duotone" className="greet-globe-icon" />
    </div>
    <p className="greet-quiz-hint">{content.quiz.finalTask}</p>
  </section>;
}
