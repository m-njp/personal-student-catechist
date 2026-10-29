"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { isLotDone, leadersFound } from "../BayanRules";
import { LOT_IDS, type BayanContent } from "../content";
import type { BayanSession } from "../session";
import { useSaved, useUi } from "../useBayan";
import { actionButton, panel } from "./styles";

interface BuiltCardProps {
  session: BayanSession;
  content: BayanContent;
  /** The buildings sheet: one cell per lot, in lot order. */
  sheet: string;
}

/** The reward for a finished building: the building itself, who leads it, and how far the town has come. */
export function BuiltCard({ session, content, sheet }: BuiltCardProps) {
  const lot = useUi(session, (state) => state.built);
  const progress = useSaved(session, (state) => state.progress);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (lot) button.current?.focus();
  }, [lot]);

  if (!lot) return null;
  const { building, leaders } = content.lots[lot];
  const art = { backgroundImage: `url(${sheet})`, "--cell": LOT_IDS.indexOf(lot), "--cells": LOT_IDS.length } as CSSProperties;
  const found = leadersFound(progress);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink/40 p-game-gap">
      <section
        role="dialog"
        aria-label={`Our ${building} is built`}
        className={`flex w-full max-w-dialog animate-pop-in flex-col items-center gap-game-gap text-center ${panel}`}
      >
        <p className="pixel rounded-full border-2 border-ink bg-leaf px-5 py-1 text-game-small lowercase text-paper">built</p>
        <h2 className="pixel text-game-title lowercase">our {building} is built!</h2>
        <div aria-hidden className="building-art animate-rise-in" style={art} />
        <p className="text-game">
          <span className="block text-game-small uppercase tracking-label text-muted">Led by</span>
          <span className="font-semibold">{leaders}</span>
        </p>
        {progress.stage === 1 && (
          <p className="flex items-center gap-1.5 text-game-small text-muted">
            {LOT_IDS.map((id) => (
              <span
                key={id}
                aria-hidden
                className={`flex size-6 items-center justify-center rounded-md border-2 ${
                  isLotDone(progress, id) ? "border-leaf bg-leaf text-paper" : "border-ink/40 bg-paper"
                }`}
              >
                {isLotDone(progress, id) && <Check className="size-4" strokeWidth={3} />}
              </span>
            ))}
            <span className="ml-1">
              {found} of {LOT_IDS.length} leaders found
            </span>
          </p>
        )}
        <button
          ref={button}
          type="button"
          onClick={() => session.director.closeBuilt()}
          className={actionButton}
        >
          Continue
          <ChevronRight aria-hidden className="size-5" strokeWidth={3} />
        </button>
      </section>
    </div>
  );
}
