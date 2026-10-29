"use client";

import {
  ArrowCounterClockwiseIcon,
  GearSixIcon,
  MinusIcon,
  PlusIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { fill, type GreetContent } from "../content";
import { hold, tunables, type Tunable } from "../detection/config";
import type { GreetStore } from "../game/store";
import { useGreet } from "../game/useGreet";
import { cornerButton, panelLabel, panelRow as row } from "./styles";

interface SwitchProps {
  on: boolean;
  onChange: (on: boolean) => void;
  icon: ReactNode;
  label: string;
  words: GreetContent["teacher"];
}

function Switch({ on, onChange, icon, label, words }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`${row} justify-between`}>
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`rounded-none px-2.5 py-0.5 text-xs font-bold ${on ? "bg-greet-night text-greet-cream" : "bg-greet-night/10"}`}>
        {on ? words.on : words.off}
      </span>
    </button>
  );
}

interface SliderProps {
  label: string;
  shown: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}

function Slider({ label, shown, value, range, onChange }: SliderProps) {
  return (
    <label className="flex min-h-11 flex-col justify-center gap-1 px-3 text-sm">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums">{shown}</span>
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full accent-greet-pink"
      />
    </label>
  );
}

/** The teacher's corner panel: sound, no-camera mode, groups and scores, detection, and reset. Reset asks twice. */
export function TeacherPanel({ content, store }: { content: GreetContent; store: GreetStore }) {
  const words = content.teacher;
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const league = useGreet(store, (state) => state.league);
  const settings = useGreet(store, (state) => state.settings);
  const dispatch = useGreet(store, (state) => state.dispatch);
  const setSettings = useGreet(store, (state) => state.setSettings);
  const count = league.scores.length;

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    if (!confirming) return setConfirming(true);
    dispatch({ type: "reset" });
    close();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={words.open}
        title={words.open}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={cornerButton}
      >
        {open ? <XIcon aria-hidden weight="bold" className="size-5" /> : <GearSixIcon aria-hidden weight="fill" className="size-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 flex max-h-teacher-panel w-80 border border-greet-night flex-col gap-1 overflow-y-auto rounded-none bg-greet-cream p-2 font-greet-body text-greet-night shadow-greet-card">
          <p className={panelLabel}>{words.title}</p>
          <Switch
            on={settings.sound}
            onChange={(sound) => setSettings({ sound })}
            icon={settings.sound ? <SpeakerHighIcon aria-hidden className="size-4" /> : <SpeakerSlashIcon aria-hidden className="size-4" />}
            label={words.sound}
            words={words}
          />
          <Switch
            on={settings.noCamera}
            onChange={(noCamera) => setSettings({ noCamera })}
            icon={settings.noCamera ? <VideoCameraSlashIcon aria-hidden className="size-4" /> : <VideoCameraIcon aria-hidden className="size-4" />}
            label={words.noCamera}
            words={words}
          />

          <p className={panelLabel}>{words.groups}</p>
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              aria-label={words.fewer}
              disabled={count <= content.groups.min}
              onClick={() => dispatch({ type: "setGroups", count: count - 1 })}
              className={`${cornerButton} disabled:opacity-40`}
            >
              <MinusIcon aria-hidden weight="bold" className="size-4" />
            </button>
            <span aria-live="polite" className="font-greet-sign text-2xl tabular-nums">
              {count}
            </span>
            <button
              type="button"
              aria-label={words.more}
              disabled={count >= content.groups.max}
              onClick={() => dispatch({ type: "setGroups", count: count + 1 })}
              className={`${cornerButton} disabled:opacity-40`}
            >
              <PlusIcon aria-hidden weight="bold" className="size-4" />
            </button>
          </div>

          <p className={panelLabel}>{words.scores}</p>
          {league.scores.map((score, group) => (
            <label key={group} className={`${row} justify-between hover:bg-transparent`}>
              {fill(content.group, { n: group + 1 })}
              <input
                type="number"
                min={0}
                step={10}
                value={score}
                onChange={(event) => dispatch({ type: "setScore", group, score: event.target.valueAsNumber })}
                className="min-h-11 w-24 rounded-none bg-greet-night/10 px-3 text-right tabular-nums"
              />
            </label>
          ))}

          <p className={panelLabel}>{words.detection}</p>
          <Slider
            label={words.hold}
            shown={fill(words.seconds, { n: settings.holdMs / 1000 })}
            value={settings.holdMs}
            range={hold}
            onChange={(holdMs) => setSettings({ holdMs })}
          />
          {(Object.keys(tunables) as Tunable[]).map((key) => (
            <Slider
              key={key}
              label={words.thresholds[key]}
              shown={String(settings.thresholds[key])}
              value={settings.thresholds[key]}
              range={tunables[key]}
              onChange={(value) => setSettings({ thresholds: { ...settings.thresholds, [key]: value } })}
            />
          ))}

          <button type="button" onClick={reset} className={`${row} mt-2 ${confirming ? "bg-greet-pink hover:bg-greet-pink" : ""}`}>
            <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {confirming ? words.confirmReset : words.reset}
          </button>
        </div>
      )}
    </div>
  );
}
