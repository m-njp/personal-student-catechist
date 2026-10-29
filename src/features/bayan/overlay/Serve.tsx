"use client";

import { Check, ChevronDown, ChevronUp, HandHeart, PenLine, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Reflection } from "@/core/reflection/Reflection";
import { LOT_IDS, type BayanContent, type LotId } from "../content";
import type { BayanSession } from "../session";
import { useUi } from "../useBayan";
import { actionButton, panel } from "./styles";

type Save = (input: { pupilName: string; content: string }) => Promise<Reflection>;

/** The group's newest sentence. Each group saves under its own name. */
function newest(entries: readonly Reflection[] | null, group: string): Reflection | null {
  let best: Reflection | null = null;
  for (const entry of entries ?? []) {
    if (entry.pupilName === group && (!best || entry.createdAt > best.createdAt)) best = entry;
  }
  return best;
}

interface BoardProps {
  session: BayanSession;
  content: BayanContent;
  entries: readonly Reflection[] | null;
  /** The buildings sheet: one cell per lot, in lot order. */
  sheet: string;
}

/**
 * Stage 5: a tarpaulin with each group's promise beside its building. It sits under the quest card,
 * out of the town's way, and folds up to a line on a small screen.
 */
export function ServeBoard({ session, content, entries, sheet }: BoardProps) {
  const [open, setOpen] = useState(true);
  const written = LOT_IDS.filter((lot) => newest(entries, content.lots[lot].group)).length;

  return (
    <section aria-label="Our promises" className="w-quest max-w-full rounded-2xl border-3 border-gold bg-paper/95 p-3 shadow-game">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <span className="pixel block text-game lowercase">our promises</span>
          <span className="block text-game-small text-muted">
            {written} of {LOT_IDS.length} groups
          </span>
        </span>
        {open ? <ChevronUp aria-hidden className="size-5 shrink-0" /> : <ChevronDown aria-hidden className="size-5 shrink-0" />}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-2">
          {LOT_IDS.map((lot) => {
            const { group, starter } = content.lots[lot];
            const entry = newest(entries, group);
            const art = { backgroundImage: `url(${sheet})`, "--cell": LOT_IDS.indexOf(lot), "--cells": LOT_IDS.length } as CSSProperties;
            return (
              <li key={lot} className="flex items-center gap-2">
                <div aria-hidden className="building-art building-thumb shrink-0" style={art} />
                <p className="min-w-0 text-game-small">
                  <span className="pixel block lowercase text-muted">{group}</span>
                  <span className={entry ? "font-medium" : "italic text-muted"}>{entry ? entry.content : `${starter}...`}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => session.ui.setState({ writing: true })} className={`mt-3 w-full justify-center ${actionButton}`}>
        <PenLine aria-hidden className="size-4" />
        Write our sentence
      </button>
      {/* The teacher ends the lesson here once the groups are done. */}
      <button
        type="button"
        onClick={() => session.director.closingPrayer()}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper px-5 text-game-small font-medium hover:bg-wash"
      >
        <HandHeart aria-hidden className="size-4" />
        Closing prayer
      </button>
    </section>
  );
}

/** Where a group writes its sentence. Opened from the board; the pupil stands still meanwhile. */
export function ServeWriter({ session, content, save }: { session: BayanSession; content: BayanContent; save: Save }) {
  const writing = useUi(session, (state) => state.writing);
  if (!writing) return null;
  return <Writer content={content} save={save} close={() => session.ui.setState({ writing: false })} />;
}

function Writer({ content, save, close }: { content: BayanContent; save: Save; close: () => void }) {
  const [lot, setLot] = useState<LotId>("house");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const { group, starter } = content.lots[lot];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const rest = text.trim();
    if (!rest) return;
    setState("saving");
    try {
      await save({ pupilName: group, content: `${starter} ${rest}` });
      if (!mounted.current) return;
      setText("");
      setState("saved");
    } catch {
      if (mounted.current) setState("error");
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-game-gap">
      <form
        onSubmit={submit}
        aria-label="Write your group's sentence"
        className={`pointer-events-auto flex w-full max-w-dialog animate-pop-in flex-col gap-game-gap ${panel}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Group">
            {LOT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === lot}
                onClick={() => {
                  setLot(id);
                  setState("idle");
                }}
                className={`min-h-11 rounded-full border-2 px-4 text-game-small font-medium ${
                  id === lot ? "border-ink bg-ink text-paper" : "border-ink/30 bg-paper hover:bg-wash"
                }`}
              >
                {content.lots[id].group}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper hover:bg-wash"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <label className="flex flex-wrap items-baseline gap-2 text-game">
          <span className="font-semibold">{starter}</span>
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (state !== "saving") setState("idle");
            }}
            maxLength={200}
            autoFocus
            className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-ink/40 bg-paper px-3 py-2 text-game outline-none focus:border-ink"
          />
        </label>
        <div className="flex items-center justify-end gap-3">
          {state === "saved" && (
            <span role="status" className="inline-flex items-center gap-1.5 text-game-small font-medium text-leaf">
              <Check aria-hidden className="size-4" strokeWidth={3} />
              On the board
            </span>
          )}
          {state === "error" && (
            <span role="alert" className="text-game-small font-medium text-ink">
              Could not save. Try again.
            </span>
          )}
          <button type="submit" disabled={state === "saving" || text.trim() === ""} className={actionButton}>
            {state === "saving" ? "Saving" : "Hang it up"}
          </button>
        </div>
      </form>
    </div>
  );
}
