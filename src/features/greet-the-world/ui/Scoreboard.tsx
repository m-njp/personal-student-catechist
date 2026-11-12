import { useState } from "react";
import { fill, type GreetContent } from "../content";
import { KeyButton } from "./KeyButton";

interface ScoreboardProps {
  content: GreetContent; scores: readonly number[]; played: readonly boolean[];
  onTurn: (group: number) => void; onFinal: () => void;
}

/** Pick one group to send its player. Saved scores remain shared across turns. */
export function Scoreboard({ content, scores, played, onTurn, onFinal }: ScoreboardProps) {
  const [picked, setPicked] = useState(0);
  const chosen = picked < scores.length ? picked : 0;
  return <>
    <h2 id="greet-match-heading" className="greet-heading">{content.quiz.match}</h2>
    <div role="group" aria-labelledby="greet-match-heading" className="greet-match">
      {scores.map((score, group) => <button key={group} type="button" aria-pressed={chosen === group}
        onClick={() => setPicked(group)} className="greet-match-group">
        <span>{fill(content.group, { n: group + 1 })}</span><strong>{score}</strong>
        <small>{played[group] ? content.quiz.played : content.quiz.ready}</small>
      </button>)}
    </div>
    <div className="greet-tool-row">
      <KeyButton tone="play" onClick={() => onTurn(chosen)}>{fill(content.quiz.start, { group: fill(content.group, { n: chosen + 1 }) })}</KeyButton>
      <KeyButton tone="plain" onClick={onFinal}>{content.quiz.final}</KeyButton>
    </div>
  </>;
}
