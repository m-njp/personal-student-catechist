import { CheckIcon, VideoCameraIcon } from "@phosphor-icons/react";
import type { GreetContent } from "../content";
import { KeyButton } from "./KeyButton";

export function Loading({ content, step, failed, onRetry, onBack }: { content: GreetContent; step: number; failed: boolean; onRetry: () => void; onBack: () => void }) {
  return <div className="greet-loading" role="status">
    <VideoCameraIcon aria-hidden weight="duotone" className="size-12" /><p className="greet-eyebrow">{content.flow[0]}</p><h2 className="greet-heading">{failed ? content.loading.failed : content.loading.title}</h2>
    {failed ? <KeyButton tone="play" onClick={onRetry}>{content.camera.retry}</KeyButton> : <ol>{content.loading.steps.map((line, i) => <li key={line} data-active={i === step}><span className="greet-check-box">{i < step ? <CheckIcon aria-hidden /> : String(i + 1).padStart(2, "0")}</span>{line}</li>)}</ol>}
    <button type="button" className="greet-text-button" onClick={onBack}>{content.menu.back}</button>
  </div>;
}
