import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { fill, signsOf, type Challenge, type GreetContent } from "../content";
import type { CameraLoop } from "../detection/CameraLoop";
import type { Player, QuizSession, QuizState, Side } from "../game/QuizSession";
import { SIGN_ICONS } from "./signs";

interface ChallengePanelProps {
  content: GreetContent;
  session: QuizSession;
  state: QuizState;
  /** The camera, so each answer shows both players' meters as they make its sign. Null without a camera. */
  loop: CameraLoop | null;
}

const SIDE_CLASS = ["greet-side-blue", "greet-side-orange"];

/** A card's answers, each with the sign that gives it. A pose has one tile: the action itself. */
function tilesOf(card: Challenge, content: GreetContent) {
  const signs = signsOf(card);
  if (card.kind === "trueFalse") {
    return [
      { sign: signs[0], mark: null, text: content.answers.true, value: true, right: card.answer },
      { sign: signs[1], mark: null, text: content.answers.false, value: false, right: !card.answer },
    ] as const;
  }
  if (card.kind === "choice") {
    return card.choices.map((text, i) => ({ sign: signs[i], mark: content.answers.letters[i], text, value: i as 0 | 1 | 2, right: card.answer === i }));
  }
  return [{ sign: card.pose, mark: null, text: content.readings[card.pose].label, value: null, right: true }];
}

/** The line under a card: which sign gives which answer, or what to do for a pose. */
function hintOf(card: Challenge, content: GreetContent): string {
  if (card.kind === "pose") return content.poseHint;
  const answers = card.kind === "trueFalse" ? [content.answers.true, content.answers.false] : content.answers.letters;
  return signsOf(card)
    .map((sign, i) => fill(content.quiz.signFor, { sign: content.readings[sign].label, answer: answers[i] }))
    .join(" ");
}

/** One group's line under the card: thinking, answered, or how it went. */
function sideLine(side: Side, state: QuizState, content: GreetContent): ReactNode {
  const words = content.quiz;
  if (state.phase !== "result") return side.answered ? words.answered : words.waiting;
  if (side.correct) return <><CheckIcon aria-hidden weight="bold" />{words.right} {fill(words.points, { n: side.earned })}</>;
  return <><XIcon aria-hidden weight="bold" />{side.answered ? words.oops : words.timeUp}</>;
}

/**
 * The question beside the camera. It runs by itself: the card shows with a 3, 2, 1, its timer starts, and
 * the answer shows before the next card. Every answer tile shows the sign that gives it.
 */
export function ChallengePanel({ content, session, state, loop }: ChallengePanelProps) {
  const words = content.quiz;
  const card = state.challenge;
  const list = useRef<HTMLUListElement>(null);

  // Each answer's two bars follow the players' signs every frame: how close, then how long it is held.
  useEffect(() => {
    const tiles = list.current;
    if (!loop || !tiles) return;
    const meters = tiles.querySelectorAll<HTMLElement>("[data-meter]");
    return loop.onFrame((frame) => {
      meters.forEach((meter) => {
        const player = frame.players[Number(meter.dataset.player)];
        const sign = meter.dataset.meter as keyof NonNullable<typeof player>["hold"];
        meter.style.setProperty("--level", String(Math.min(1, player?.shown[sign] ?? 0)));
        meter.style.setProperty("--hold", String(player?.hold[sign] ?? 0));
      });
    });
  }, [loop, card]);

  if (!card) return null;
  const answering = state.phase === "running";
  const result = state.phase === "result";
  const groups = state.sides.map((side) => fill(content.group, { n: side.group + 1 }));
  const tiles = tilesOf(card, content);

  return (
    <section className="greet-card" aria-live="polite">
      <header className="greet-card-head">
        <span className="greet-eyebrow">{fill(words.round, { n: state.index + 1, all: content.questions.length })}</span>
        <span className="greet-kind">{words.kinds[card.kind]}</span>
        <span className="greet-timer" role="timer" data-state={state.phase === "card" ? "ready" : answering && state.remainingMs <= 3000 ? "low" : undefined}>
          {state.paused ? words.paused : state.phase === "card" ? state.countdown : answering ? Math.ceil(state.remainingMs / 1000) : ""}
        </span>
      </header>
      {state.phase === "card" && <p className="greet-get-ready">{words.getReady}</p>}

      <h2 className="greet-question">{card.text}</h2>

      <ul ref={list} className={`greet-options greet-options-${card.kind}`}>
        {tiles.map((tile) => {
          const Sign = SIGN_ICONS[tile.sign];
          return (
            <li key={tile.text} className="greet-option" data-right={result && card.kind !== "pose" && tile.right}>
              {tile.mark && <span className="greet-option-mark">{tile.mark}</span>}
              <Sign aria-hidden weight="duotone" className="greet-option-sign" />
              <span className="greet-option-text">
                {tile.text}
                {card.kind !== "pose" && <small>{content.readings[tile.sign].label}</small>}
              </span>
              <span className="greet-option-meters" aria-hidden>
                {state.sides.map((side, i) => (
                  <span key={SIDE_CLASS[i]} data-meter={tile.sign} data-player={i} className={`greet-meter ${SIDE_CLASS[i]}`}>
                    <span className="greet-tag-level" />
                    <span className="greet-tag-held" />
                  </span>
                ))}
              </span>
              {answering && tile.value !== null && (
                <span className="greet-option-sides">
                  {state.sides.map((side, i) => (
                    <button
                      key={SIDE_CLASS[i]}
                      type="button"
                      className={SIDE_CLASS[i]}
                      disabled={state.paused || side.answered}
                      aria-label={`${groups[i]}: ${tile.text}`}
                      onClick={() => session.answer(tile.value, i as Player)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="greet-quiz-hint">{hintOf(card, content)}</p>
      {result && state.answer && <p className="greet-answer-line">{fill(words.answerIs, { answer: state.answer })}</p>}

      <ul className="greet-sides">
        {state.sides.map((side, i) => (
          <li key={SIDE_CLASS[i]} className={SIDE_CLASS[i]} data-correct={result ? side.correct : undefined}>
            <span className="greet-side-badge">{i + 1}</span>
            <span>
              <strong>{groups[i]}</strong>
              <span>{sideLine(side, state, content)}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="greet-card-actions">
        <div className="greet-tool-row">
          <button type="button" className="greet-tool" onClick={() => session.pause()}>
            {state.paused ? words.resume : words.pause}
          </button>
          <button type="button" className="greet-tool" disabled={result} onClick={() => session.skip()}>
            {words.skip}
          </button>
          {answering &&
            card.kind === "pose" &&
            state.sides.map((side, i) => (
              <button
                key={SIDE_CLASS[i]}
                type="button"
                className={`greet-tool ${SIDE_CLASS[i]}`}
                disabled={state.paused || side.answered}
                onClick={() => session.mark(true, i as Player)}
              >
                {fill(words.markDone, { group: groups[i] })}
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
