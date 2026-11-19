"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { PARTS } from "../BayanRules";
import { LOT_IDS, type BayanContent } from "../content";
import type { BayanSession } from "../session";
import { useSaved, useUi } from "../useBayan";
import { actionButton, panel } from "./styles";

/** The church art's six tile rows, and each part's rows from the top: the capstone, the walls, the foundation. */
const ROWS = 6;
const BANDS = [
  { part: 2, from: 0, to: 2 },
  { part: 1, from: 2, to: 5 },
  { part: 0, from: 5, to: 6 },
] as const;

type PartState = "dark" | "new" | "lit";

interface ChurchCloseUpProps {
  session: BayanSession;
  content: BayanContent;
  /** The buildings sheet: one cell per lot, in lot order. */
  sheet: string;
}

/**
 * Stage 2: the standing church up close, its foundation, walls, and capstone dark until Father's
 * questions light them one by one, each with its name and who it stands for. Then the whole church shines.
 */
export function ChurchCloseUp({ session, content, sheet }: ChurchCloseUpProps) {
  const open = useUi(session, (state) => state.closeUp);
  const revealed = useSaved(session, (state) => state.progress.revealed);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) button.current?.focus();
  }, [open, revealed]);

  if (!open) return null;
  const whole = revealed > PARTS;
  const stateOf = (part: number): PartState => (part >= revealed ? "dark" : part === revealed - 1 ? "new" : "lit");
  const caption = revealed === 0 ? content.closeUp : whole ? content.heldTogether : content.churchParts[revealed - 1];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink/70 p-game-gap">
      <section
        role="dialog"
        aria-label={caption.title}
        className={`flex max-h-full w-full max-w-dialog animate-pop-in flex-col gap-game-gap overflow-y-auto ${panel}`}
      >
        <div className="flex flex-col items-center gap-game-gap sm:flex-row">
          <div aria-hidden className={`church-closeup ${whole ? "animate-church-glow" : ""}`}>
            {BANDS.map(({ part, from, to }) => {
              const state = stateOf(part);
              const style = {
                backgroundImage: `url(${sheet})`,
                "--cell": LOT_IDS.indexOf("church"),
                "--cells": LOT_IDS.length,
                "--from": `${(from / ROWS) * 100}%`,
                "--to": `${((ROWS - to) / ROWS) * 100}%`,
              } as CSSProperties;
              return (
                <div
                  key={part}
                  style={style}
                  className={`building-art ${state === "dark" ? "church-part-dark" : ""} ${state === "new" ? "animate-part-light" : ""}`}
                />
              );
            })}
          </div>
          <ol className="flex w-full flex-1 flex-col gap-2">
            {BANDS.map(({ part }) => {
              const { title, who } = content.churchParts[part];
              const state = stateOf(part);
              return (
                <li
                  key={part}
                  className={`flex min-h-11 flex-col justify-center rounded-xl border-2 px-3 py-1.5 ${
                    state === "dark" ? "border-dashed border-ink/30 text-muted" : "border-ink"
                  } ${state === "new" ? "animate-pop-in bg-gold" : state === "lit" ? "bg-gold/25" : ""}`}
                >
                  <span className="pixel text-game-small tracking-label">{title}</span>
                  <span className="text-game font-semibold">{state === "dark" ? "?" : who}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <h2 className="pixel text-game-title">{caption.title}</h2>
        <p className="text-game font-medium">{caption.body}</p>
        <div className="flex justify-end">
          <button ref={button} type="button" onClick={() => session.director.closeCloseUp()} className={actionButton}>
            Continue
            <ChevronRight aria-hidden className="size-5" strokeWidth={3} />
          </button>
        </div>
      </section>
    </div>
  );
}
