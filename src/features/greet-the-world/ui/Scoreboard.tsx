import { useState } from "react";
import { fill, type GreetContent } from "../content";
import { KeyButton } from "./KeyButton";

interface ScoreboardProps {
  content: GreetContent;
  scores: readonly number[];
  played: readonly boolean[];
  onMatch: (blue: number, orange: number) => void;
  onFinal: () => void;
}

const SIDE_CLASS = ["greet-side-blue", "greet-side-orange"];

/** Every group's score, and the two groups the teacher picks for the next match: Blue on the left, Orange on the right. */
export function Scoreboard({ content, scores, played, onMatch, onFinal }: ScoreboardProps) {
  const [picked, setPicked] = useState<[number, number]>([0, 1]);
  // Groups removed from the teacher panel fall back to the first two that are still there.
  const chosen: [number, number] = picked.every((group) => group < scores.length) ? picked : [0, 1];

  const pick = (side: number, group: number) =>
    setPicked(side === 0 ? [group, chosen[1] === group ? chosen[0] : chosen[1]] : [chosen[0] === group ? chosen[1] : chosen[0], group]);

  return (
    <>
      <div className="greet-match">
        {content.quiz.sides.map((label, side) => (
          <fieldset key={label} className={`greet-match-side ${SIDE_CLASS[side]}`}>
            <legend>{label}</legend>
            {scores.map((score, group) => (
              <button
                key={group}
                type="button"
                aria-pressed={chosen[side] === group}
                onClick={() => pick(side, group)}
                className="greet-match-group"
              >
                <span>{fill(content.group, { n: group + 1 })}</span>
                <strong>{score}</strong>
                <small>{played[group] ? content.quiz.played : content.quiz.ready}</small>
              </button>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="greet-tool-row">
        <KeyButton tone="play" onClick={() => onMatch(chosen[0], chosen[1])}>
          {fill(content.quiz.versus, { blue: fill(content.group, { n: chosen[0] + 1 }), orange: fill(content.group, { n: chosen[1] + 1 }) })}
        </KeyButton>
        <KeyButton tone="plain" onClick={onFinal}>
          {content.quiz.final}
        </KeyButton>
      </div>
    </>
  );
}
