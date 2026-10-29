import type { GreetContent } from "../content";

export type FieldStep = "setup" | "guide" | "play";

export function FieldHeader({ content, step, onStep, onHome }: { content: GreetContent; step: FieldStep; onStep: (step: FieldStep) => void; onHome: () => void }) {
  const steps = ["setup", "guide", "play"] as const;
  return (
    <header className="greet-header">
      <button type="button" onClick={onHome} className="greet-wordmark">{content.title}</button>
      <nav aria-label={content.title} className="greet-stepnav">
        {steps.map((key, i) => (
          <button type="button" key={key} aria-current={step === key ? "step" : undefined} onClick={() => onStep(key)}>
            <span className="greet-step-number">{String(i + 1).padStart(2, "0")}</span>{content.flow[i]}
          </button>
        ))}
      </nav>
    </header>
  );
}
