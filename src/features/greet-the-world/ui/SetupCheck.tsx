"use client";

import { CheckCircleIcon, CheckIcon, UserIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fill, type GreetContent, type Reading } from "../content";
import type { GreetSound } from "../GreetActivity";
import type { CameraSettings } from "../detection/CameraLoop";
import type { DetectionLog } from "../detection/DetectionLog";
import type { Models } from "../detection/models";
import { setupSigns, setupStatus } from "../detection/setupStatus";
import { useLiveCamera } from "../detection/useCamera";
import { CameraStage } from "./CameraStage";
import { DetectorPanel } from "./DetectorPanel";
import { SIGN_ICONS } from "./signs";

interface SetupCheckProps {
  content: GreetContent;
  models: Models;
  log: DetectionLog;
  settings: CameraSettings;
  play: (sound: GreetSound) => void;
  onContinue: () => void;
}

const SIDE_CLASS = ["greet-side-blue", "greet-side-orange"];

// One list per sign, kept, so the loop is not told its target changed on every render.
const single = new Map<Reading, readonly Reading[]>();
const only = (reading: Reading) => {
  if (!single.has(reading)) single.set(reading, [reading]);
  return single.get(reading) ?? [reading];
};

/**
 * The teacher's check before class. Both players are found, then each sign the questions use is tried
 * one at a time: the seconds held count up, and a big check and a sound mark each one. When every sign
 * has passed, one big button starts the game.
 */
export function SetupCheck({ content, models, log, settings, play, onContinue }: SetupCheckProps) {
  const { loop, view, onVideo } = useLiveCamera(models, log, settings);
  const signs = useMemo(() => setupSigns(content), [content]);
  const status = setupStatus(view, signs);
  const passed = new Set(view?.passed);
  const [chosen, setChosen] = useState<Reading | null>(null);
  // The sign being tried: the one the teacher tapped, or else the next one not yet passed.
  const current = chosen ?? status.remaining[0] ?? signs[signs.length - 1];
  const targets = only(current);
  const seconds = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const words = content.setup;
  const Sign = SIGN_ICONS[current];

  useEffect(() => {
    loop?.target(targets);
  }, [loop, targets]);

  // The seconds held, from whichever player is closest to passing.
  useEffect(
    () =>
      loop?.onFrame((frame) => {
        const held = Math.max(0, ...frame.players.map((player) => player?.hold[current] ?? 0));
        if (seconds.current) seconds.current.textContent = fill(words.holding, { n: ((held * settings.holdMs) / 1000).toFixed(1), all: (settings.holdMs / 1000).toFixed(1) });
        if (bar.current) bar.current.style.transform = `scaleX(${held})`;
      }),
    [loop, current, settings.holdMs, words.holding],
  );

  // A chime each time a sign passes.
  const count = view?.passed.length ?? 0;
  const heard = useRef(count);
  useEffect(() => {
    if (count > heard.current) play("pass");
    heard.current = count;
  }, [count, play]);

  return (
    <div className="greet-page greet-workspace">
      <div className="greet-camera-workspace">
        <CameraStage content={content} models={models} loop={loop} view={view} onVideo={onVideo} targets={targets} names={[content.players[0], content.players[1]]} />
        <DetectorPanel content={content} models={models} loop={loop} log={log} thresholds={settings.thresholds} targets={targets} />
      </div>
      <aside className="greet-sidebar">
        <h2 className="greet-heading">{words.title}</h2>

        <ul className="greet-setup-players">
          {content.players.map((name, i) => {
            const found = view?.players[i]?.found === true;
            return (
              <li key={name} className={SIDE_CLASS[i]} data-found={found}>
                <span className="greet-side-badge">{i + 1}</span>
                {fill(found ? words.found : words.missing, { player: name })}
                {found ? <CheckIcon aria-hidden weight="bold" /> : <UserIcon aria-hidden />}
              </li>
            );
          })}
        </ul>

        {view?.light && (
          <p className={`greet-setup-block greet-setup-light ${view.light === "ok" ? "" : "greet-setup-warning"}`} role="status">
            {view.light === "ok" ? <><CheckIcon aria-hidden />{words.lighting}</> : view.light === "backlit" ? words.backlit : words.dark}
          </p>
        )}

        <section className="greet-tryout" data-passed={passed.has(current)} aria-live="polite">
          {passed.has(current) ? <CheckCircleIcon aria-hidden weight="fill" className="greet-tryout-check" /> : <Sign aria-hidden weight="duotone" className="greet-tryout-sign" />}
          <strong>{content.readings[current].label}</strong>
          <span>{passed.has(current) ? words.passed : content.readings[current].hint}</span>
          <span ref={seconds} className="greet-tryout-seconds" />
          <span className="greet-tag-hold">
            <span ref={bar} />
          </span>
        </section>

        <button type="button" className="greet-setup-done" data-complete={status.complete} onClick={onContinue}>
          <CheckCircleIcon aria-hidden weight={status.complete ? "fill" : "regular"} />
          {status.complete ? words.complete : content.ui.continue}
        </button>
        <p className="greet-hint">
          {words.pick} {fill(words.count, { done: status.done, all: status.total })}
        </p>
        <ul className="greet-sign-grid">
          {signs.map((reading) => {
            const Icon = SIGN_ICONS[reading];
            return (
              <li key={reading}>
                <button type="button" aria-pressed={reading === current} data-passed={passed.has(reading)} onClick={() => setChosen(reading)}>
                  <Icon aria-hidden weight="duotone" />
                  <span>{content.readings[reading].label}</span>
                  {passed.has(reading) && <CheckIcon aria-hidden weight="bold" className="greet-sign-done" />}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" className="greet-text-button" onClick={() => loop?.relock()}>
          {words.findAgain}
        </button>
        <p className="greet-hint">{words.privacy}</p>
      </aside>
    </div>
  );
}
