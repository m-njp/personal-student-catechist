import { ArrowRightIcon } from "@phosphor-icons/react";
import type { GreetContent } from "../content";
import { AnswerSigns } from "./AnswerSigns";
import { KeyButton } from "./KeyButton";

export function GuideScreen({ content, onPlay }: { content: GreetContent; onPlay: () => void }) {
  return (
    <div className="greet-page greet-guide">
      <div className="greet-section-heading"><p className="greet-eyebrow">{content.flow[1]}</p><h2 className="greet-heading">{content.guide.title}</h2></div>
      <ol className="greet-guide-steps">
        {content.guide.steps.map((step, i) => <li className="greet-sheet" key={step.title}>
          <span className="greet-eyebrow">{String(i + 1).padStart(2, "0")}</span>
          <h3>{step.title}</h3><p>{step.text}</p>
        </li>)}
      </ol>
      <div className="greet-guide-bottom"><AnswerSigns content={content} /><KeyButton tone="play" onClick={onPlay}>{content.guide.continue}<ArrowRightIcon aria-hidden /></KeyButton></div>
    </div>
  );
}
