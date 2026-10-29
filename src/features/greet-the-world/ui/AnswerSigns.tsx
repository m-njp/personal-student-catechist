import type { GreetContent } from "../content";
import { setupSigns } from "../detection/setupStatus";
import { SIGN_ICONS } from "./signs";

/** Every sign the game uses, each with its picture and name, so players know them before they play. */
export function AnswerSigns({ content }: { content: GreetContent }) {
  return (
    <ul className="greet-answer-signs">
      {setupSigns(content).map((reading) => {
        const Icon = SIGN_ICONS[reading];
        return (
          <li key={reading}>
            <Icon aria-hidden weight="duotone" />
            <span>{content.readings[reading].label}</span>
          </li>
        );
      })}
    </ul>
  );
}
