"use client";

import { Music, RotateCcw, Settings, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LAST_STAGE, type Stage } from "../BayanRules";
import type { BayanSession } from "../session";
import { useSaved } from "../useBayan";

const STAGES: readonly Stage[] = [1, 2, 3, 4, 5];

function Toggle({ label, on, onChange, icon }: { label: string; on: boolean; onChange: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-wash"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${on ? "bg-ink text-paper" : "bg-wash text-muted"}`}>
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

type Confirm = "stage" | "town";

/** A small corner panel for the teacher: sound switches, stage jumps, the opening again, and resets. */
export function TeacherPanel({ session }: { session: BayanSession }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Confirm | null>(null);
  const [failed, setFailed] = useState(false);
  const music = useSaved(session, (state) => state.music);
  const sounds = useSaved(session, (state) => state.sounds);
  const stage = useSaved(session, (state) => state.progress.stage);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setConfirming(null);
    setFailed(false);
  };

  /** Asks twice, then resets. If the promises cannot be cleared the panel stays open to try again. */
  const reset = (kind: Confirm) => {
    if (confirming !== kind) {
      setFailed(false);
      return setConfirming(kind);
    }
    const done = kind === "stage" ? session.director.resetStage() : session.director.reset();
    done.then(close, () => {
      setConfirming(null);
      setFailed(true);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Teacher panel"
        title="Teacher panel"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-game hover:bg-wash"
      >
        {open ? <X aria-hidden className="size-5" /> : <Settings aria-hidden className="size-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 flex w-64 animate-pop-in flex-col gap-1 rounded-2xl border-2 border-ink bg-paper p-2 shadow-game">
          <p className="px-3 pb-1 pt-2 text-xs tracking-label text-muted">Teacher</p>
          <Toggle
            label="Music"
            on={music}
            onChange={() => session.saved.setState({ music: !music })}
            icon={<Music aria-hidden className="size-4" />}
          />
          <Toggle
            label="Sounds"
            on={sounds}
            onChange={() => session.saved.setState({ sounds: !sounds })}
            icon={sounds ? <Volume2 aria-hidden className="size-4" /> : <VolumeX aria-hidden className="size-4" />}
          />
          <p className="px-3 pb-1 pt-2 text-xs tracking-label text-muted">Go to stage</p>
          <div className="grid grid-cols-5 gap-1 px-1">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === stage}
                aria-label={`Go to stage ${s}`}
                onClick={() => {
                  close();
                  session.director.goToStage(s);
                }}
                className={`min-h-11 rounded-xl text-sm font-medium ${s === stage ? "bg-ink text-paper" : "hover:bg-wash"}`}
              >
                {s}
              </button>
            ))}
          </div>
          {stage < LAST_STAGE && (
            <button
              type="button"
              onClick={() => {
                close();
                session.director.goToStage((stage + 1) as Stage);
              }}
              className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm hover:bg-wash"
            >
              Next stage
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              close();
              session.director.playOpening();
            }}
            className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm hover:bg-wash"
          >
            Play the opening again
          </button>
          <button
            type="button"
            onClick={() => reset("stage")}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm ${
              confirming === "stage" ? "bg-coral text-ink" : "hover:bg-wash"
            }`}
          >
            <RotateCcw aria-hidden className="size-4" />
            {confirming === "stage" ? "Tap again to restart the stage" : "Restart this stage"}
          </button>
          <button
            type="button"
            onClick={() => reset("town")}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm ${
              confirming === "town" ? "bg-coral text-ink" : "hover:bg-wash"
            }`}
          >
            <RotateCcw aria-hidden className="size-4" />
            {confirming === "town" ? "Tap again to empty the town" : "Reset the town"}
          </button>
          {failed && (
            <p role="alert" className="px-3 pb-1 text-xs font-medium">
              Could not clear the promises. Try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
