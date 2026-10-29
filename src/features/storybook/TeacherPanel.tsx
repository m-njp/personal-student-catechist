"use client";

import { RotateCcw, Settings, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { SaveStatus } from "@/core/save/SyncedStorage";
import { cornerButton, panelLabel, panelRow as row } from "./styles";

export interface Jump {
  label: string;
  current: boolean;
  onSelect: () => void;
}

interface TeacherPanelProps {
  sound: boolean;
  onSound: (on: boolean) => void;
  jumpTitle: string;
  jumps: readonly Jump[];
  replayLabel: string;
  onReplay: () => void;
  onReset: () => void;
  status: SaveStatus;
  /** A game's own controls, shown before replay and reset. */
  children?: ReactNode;
}

/** A small corner panel for the teacher: sound, jumps, replay, and reset. Reset asks twice. */
export function TeacherPanel({
  sound,
  onSound,
  jumpTitle,
  jumps,
  replayLabel,
  onReplay,
  onReset,
  status,
  children,
}: TeacherPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };
  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Teacher panel"
        title="Teacher panel"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={cornerButton}
      >
        {open ? <X aria-hidden className="size-5" /> : <Settings aria-hidden className="size-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 flex max-h-teacher-panel w-64 flex-col overflow-y-auto gap-1 rounded-2xl border-2 border-ink bg-paper p-2 font-sans shadow-story">
          <p className={panelLabel}>Teacher</p>
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            onClick={() => onSound(!sound)}
            className={`${row} justify-between`}
          >
            <span className="flex items-center gap-2">
              {sound ? <Volume2 aria-hidden className="size-4" /> : <VolumeX aria-hidden className="size-4" />}
              Sound
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sound ? "bg-ink text-paper" : "bg-wash text-muted"}`}
            >
              {sound ? "On" : "Off"}
            </span>
          </button>
          <p className={panelLabel}>{jumpTitle}</p>
          {jumps.map((jump) => (
            <button
              key={jump.label}
              type="button"
              aria-pressed={jump.current}
              onClick={run(jump.onSelect)}
              className={`${row} ${jump.current ? "bg-ink text-paper hover:bg-ink" : ""}`}
            >
              {jump.label}
            </button>
          ))}
          {children}
          <button type="button" onClick={run(onReplay)} className={`${row} mt-1`}>
            <RotateCcw aria-hidden className="size-4" />
            {replayLabel}
          </button>
          <button
            type="button"
            onClick={confirming ? run(onReset) : () => setConfirming(true)}
            className={`${row} ${confirming ? "bg-coral hover:bg-coral" : ""}`}
          >
            <RotateCcw aria-hidden className="size-4" />
            {confirming ? "Tap again to start over" : "Reset this game"}
          </button>
          {status === "offline" && <p className="px-3 pb-1 text-xs text-muted">Saved on this laptop</p>}
        </div>
      )}
    </div>
  );
}
