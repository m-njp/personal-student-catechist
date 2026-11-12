"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useConfetti } from "@/features/storybook/useStory";
import { readToken } from "@/lib/tokens";
import { fill, signsOf, type GreetContent, type Reading } from "../content";
import type { GreetSound } from "../GreetActivity";
import type { CameraLoop, CameraSettings } from "../detection/CameraLoop";
import type { DetectionLog } from "../detection/DetectionLog";
import type { Models } from "../detection/models";
import { useLiveCamera } from "../detection/useCamera";
import type { QuizSession, QuizState } from "../game/QuizSession";
import type { GreetStore } from "../game/store";
import { useGreet } from "../game/useGreet";
import { useQuizControls } from "../game/useQuizControls";
import { useQuizSession } from "../game/useQuizSession";
import { AnswerSigns } from "./AnswerSigns";
import { CameraStage } from "./CameraStage";
import { ChallengePanel } from "./ChallengePanel";
import { FinalRound } from "./FinalRound";
import { KeyButton } from "./KeyButton";
import { Loading } from "./Loading";
import { Scoreboard } from "./Scoreboard";
import { useMusic } from "./useMusic";

interface PlayScreenProps {
  content: GreetContent;
  scores: readonly number[];
  /** Null in no-camera mode, or while the models load. */
  models: Models | null;
  cameraLoading?: { step: number; failed: boolean; retry: () => void };
  log: DetectionLog;
  settings: CameraSettings;
  store: GreetStore;
  play: (sound: GreetSound) => void;
  music: string;
  sound: boolean;
}

const ON_CAMERA = new Set(["card", "running", "result", "final"]);

interface LiveCameraProps {
  content: GreetContent;
  models: Models;
  log: DetectionLog;
  settings: CameraSettings;
  session: QuizSession;
  state: QuizState;
  name: string;
  /** The card beside the camera, which shows the player's meters on its answers. */
  panel: (loop: CameraLoop | null) => ReactNode;
}

function LiveCamera({ content, models, log, settings, session, state, name, panel }: LiveCameraProps) {
  const { loop, view, onVideo } = useLiveCamera(models, log, settings);
  const final = state.phase === "final";
  const targets = useMemo<readonly Reading[]>(() => (final ? ["twoOpenPalms"] : state.challenge ? signsOf(state.challenge) : []), [final, state.challenge]);

  useEffect(() => {
    loop?.target(state.paused ? [] : targets);
  }, [loop, targets, state.phase, state.paused]);
  // The final hold needs every frame, even when what React shows stays the same.
  useEffect(() => (loop ? loop.onFrame(() => session.observe(loop.getSnapshot())) : undefined), [loop, session]);

  return (
    <>
      <CameraStage content={content} models={models} loop={loop} view={view} onVideo={onVideo} targets={targets} name={name} answered={state.turn.answered} />
      {panel(loop)}
    </>
  );
}

/** Plays the sound for each moment of the match: the 3, 2, 1, the go, each result, and the finish. */
function useMatchSounds(state: QuizState, play: (sound: GreetSound) => void, celebrate: () => void) {
  const before = useRef(state);
  useEffect(() => {
    const last = before.current;
    before.current = state;
    if (state.phase === "card" && state.countdown > 0 && (last.countdown !== state.countdown || last.index !== state.index)) play("count");
    if (state.phase === last.phase) return;
    if (state.phase === "running") play("go");
    if (state.phase === "result") play(state.turn.correct ? "right" : "wrong");
    if (state.phase === "turnEnd" || state.phase === "finalScores") {
      play("cheer");
      celebrate();
    }
  }, [state, play, celebrate]);
}

/** One group per turn, with the camera and card beside each other. */
export function PlayScreen({ content, scores, models, cameraLoading, log, settings, store, play, music, sound }: PlayScreenProps) {
  const { session, state } = useQuizSession(content, store);
  useQuizControls(session);
  const played = useGreet(store, (saved) => saved.league.played);
  const { canvas, fire } = useConfetti();
  const celebrate = useMemo(() => () => fire([readToken("--color-greet-blue"), readToken("--color-greet-orange"), readToken("--color-greet-pink")]), [fire]);
  useMatchSounds(state, play, celebrate);
  useMusic(music, sound && ON_CAMERA.has(state.phase));
  const words = content.quiz;
  const final = state.phase === "final";
  const name = final ? content.player : fill(content.group, { n: state.turn.group + 1 });
  const panel = (loop: CameraLoop | null) =>
    final ? <FinalRound content={content} finalReady={state.finalReady} /> : <ChallengePanel content={content} session={session} state={state} loop={loop} />;

  let body;
  if (!ON_CAMERA.has(state.phase)) {
    const ranked = scores.map((score, group) => ({ score, group })).sort((a, b) => b.score - a.score);
    body = (
      <div className="greet-page greet-scoreboard">
        {state.phase === "scoreboard" && (
          <Scoreboard content={content} scores={scores} played={played} onTurn={(group) => session.startTurn(group)} onFinal={() => session.startFinal()} />
        )}
        {state.phase === "turnEnd" && (
          <>
            <h2 className="greet-heading">{words.turnEnd}</h2>
            <div className="greet-sheet greet-turn-card">
              <strong className="greet-match-name">{name}</strong>
              <strong className="greet-turn-score">{fill(words.points, { n: state.turn.score })}</strong>
            </div>
            <div className="greet-tool-row">
              <KeyButton tone="play" onClick={() => session.next()}>
                {words.scoreboardBack}
              </KeyButton>
              <KeyButton tone="plain" onClick={() => session.startFinal()}>
                {words.final}
              </KeyButton>
            </div>
          </>
        )}
        {state.phase === "finalScores" && (
          <>
            <h2 className="greet-heading">{words.finalScores}</h2>
            <ol className="greet-final-scores">
              {ranked.map(({ score, group }) => (
                <li key={group}>
                  <span>{fill(content.group, { n: group + 1 })}</span>
                  <strong>{score}</strong>
                </li>
              ))}
            </ol>
            <KeyButton tone="play" onClick={() => session.next()}>
              {words.question}
            </KeyButton>
          </>
        )}
        {state.phase === "question" && (
          <>
            <p className="greet-closing-question">{content.lines.question}</p>
            <KeyButton tone="plain" onClick={() => session.reset()}>
              {words.scoreboardBack}
            </KeyButton>
          </>
        )}
      </div>
    );
  } else {
    body = (
      <div className="greet-page greet-play">
        {!final && (
          <div className="greet-match-bar">
            <span>{name}<strong>{state.turn.score}</strong></span>
          </div>
        )}
        <div className="greet-play-workspace">
          {models ? (
            <LiveCamera content={content} models={models} log={log} settings={settings} session={session} state={state} name={name} panel={panel} />
          ) : (
            <>
              <div className="greet-manual-stage">
                {cameraLoading ? (
                  <Loading content={content} step={cameraLoading.step} failed={cameraLoading.failed} onRetry={cameraLoading.retry} onBack={() => session.reset()} />
                ) : (
                  <>
                    <p>{content.ui.manual}</p>
                    <p className="greet-hint">{words.keys}</p>
                    <AnswerSigns content={content} />
                  </>
                )}
              </div>
              {panel(null)}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {body}
      <canvas ref={canvas} aria-hidden className="greet-confetti" />
    </>
  );
}
