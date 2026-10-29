"use client";

import type { ReactNode } from "react";
import type { Expression, Person } from "./cast";
import { Say } from "./Say";

interface StoryBoardProps {
  speaker: Person;
  face: Expression;
  text: string;
  /** How far the class has come, read out as `label` with `{done}` and `{total}` filled in. */
  progress: ReactNode;
  label: string;
  done: number;
  total: number;
  children: ReactNode;
}

/** The frame both games share: who is talking and the progress on top, the game below. */
export function StoryBoard({ speaker, face, text, progress, label, done, total, children }: StoryBoardProps) {
  return (
    <div className="absolute inset-0 flex flex-col gap-story-gap p-story-gap">
      <div className="flex flex-col gap-story-gap @3xl:min-h-strip-token @3xl:flex-row @3xl:items-center @3xl:pr-corner">
        <div className="min-w-0 flex-1">
          <Say look={speaker.look} gift={speaker.gift} face={face} name={speaker.name} text={text} />
        </div>
        <div
          className="order-first flex min-h-11 shrink-0 pr-corner @3xl:order-none @3xl:pr-0"
          aria-label={label.replace("{done}", String(done)).replace("{total}", String(total))}
        >
          {progress}
        </div>
      </div>
      {children}
    </div>
  );
}
