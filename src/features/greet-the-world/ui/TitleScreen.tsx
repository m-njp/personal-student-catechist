import { ArrowRightIcon } from "@phosphor-icons/react";
import type { GreetContent } from "../content";
import { KeyButton } from "./KeyButton";
import type { FieldStep } from "./FieldHeader";

export function TitleScreen({ content, onStep }: { content: GreetContent; onStep: (step: FieldStep) => void }) {
  return (
    <div className="greet-cover">
      <div className="greet-cover-copy">
        <h2 className="greet-cover-title">{content.title}</h2>
        <p className="greet-lede">{content.introduction}</p>
        <nav aria-label={content.title} className="greet-cover-links">
          {(["setup", "guide", "play"] as const).map((step, i) => (
            <KeyButton key={step} tone={step === "setup" ? "play" : "plain"} onClick={() => onStep(step)}><span>{String(i + 1).padStart(2, "0")}</span>{content.flow[i]}<ArrowRightIcon aria-hidden /></KeyButton>
          ))}
        </nav>
      </div>
    </div>
  );
}
