import { GlobeHemisphereEastIcon } from "@phosphor-icons/react";
import type { GreetContent } from "../content";

export function FinalRound({ content, finalReady }: { content: GreetContent; finalReady: boolean }) {
  return <section className="greet-card greet-final" aria-live="polite">
    <span className="greet-eyebrow">{content.quiz.final}</span>
    <h2 className="greet-question">{content.lines.final}</h2>
    <div className="greet-globe" data-done={finalReady}>
      <svg viewBox="0 0 100 100" aria-hidden className="greet-globe-ring">
        <path d="M50 2a48 48 0 1 0 0 96a48 48 0 1 0 0-96 M50 14a36 36 0 1 1 0 72a36 36 0 1 1 0-72" fillRule="evenodd" data-lit={finalReady} />
      </svg>
      <GlobeHemisphereEastIcon aria-hidden weight="duotone" className="greet-globe-icon" />
    </div>
    <p className="greet-quiz-hint">{content.quiz.finalTask}</p>
  </section>;
}
