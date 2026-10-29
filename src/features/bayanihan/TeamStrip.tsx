"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { memo } from "react";
import { giftColor, type Expression, type WorkerGift } from "@/features/storybook/cast";
import { Token } from "@/features/storybook/art/Token";
import { readNumberToken as timing } from "@/lib/tokens";
import type { Worker } from "./content";

interface CardProps {
  worker: Worker;
  index: number;
  face: Expression;
  placed: boolean;
  selected: boolean;
  locked: boolean;
  /** Goes up on each wrong match, which shakes the token. */
  shakes: number;
  onSelect: (gift: WorkerGift) => void;
}

/** One friend on their card. They bob while they wait, lift when picked, and shake at a wrong job. */
const Card = memo(function Card({ worker, index, face, placed, selected, locked, shakes, onSelect }: CardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: worker.gift, disabled: placed || locked });
  const shaking = shakes > 0 && !selected;
  return (
    <li className="min-w-0 flex-1 @3xl:flex-none">
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => onSelect(worker.gift)}
        disabled={placed || locked}
        aria-pressed={selected}
        aria-label={`${worker.name}. ${worker.can}.`}
        className={`grid w-full touch-none grid-cols-1 justify-items-center gap-x-story-gap gap-y-1 rounded-story border-3 border-l-8 border-ink bg-paper p-story-gap text-center shadow-story transition-transform disabled:cursor-default @3xl:grid-cols-[auto_1fr] @3xl:justify-items-start @3xl:text-left ${
          selected ? "scale-105 bg-wash ring-4 ring-ink" : "hover:-translate-y-0.5"
        }`}
        style={{ borderLeftColor: giftColor(worker.gift) }}
      >
        <span className="relative aspect-square w-strip-token @3xl:row-span-2">
          {placed ? (
            <span className="block size-full rounded-full border-3 border-dashed border-ink/30" />
          ) : (
            <motion.span
              key={shakes}
              layoutId={`worker-${worker.gift}`}
              className={`block size-full ${isDragging ? "opacity-0" : ""}`}
              animate={
                shaking
                  ? { x: ["0%", "-12%", "12%", "-8%", "8%", "0%"] }
                  : { y: selected ? ["0%", "-14%", "0%"] : ["0%", "-5%", "0%"] }
              }
              transition={
                shaking
                  ? { duration: timing("--story-cheer-seconds") }
                  : { duration: selected ? timing("--story-selected-seconds") : timing("--story-idle-seconds"), repeat: Infinity, ease: "easeInOut", delay: selected ? 0 : index * timing("--story-idle-stagger-seconds") }
              }
            >
              <Token look={worker.look} gift={worker.gift} face={face} className="size-full" />
            </motion.span>
          )}
        </span>
        <span className="self-end font-story text-story-small font-bold leading-none">{worker.name}</span>
        <span className="hidden self-start text-story-small leading-tight text-muted @3xl:block">{worker.can}</span>
      </button>
    </li>
  );
});

interface TeamStripProps {
  workers: readonly Worker[];
  placed: readonly WorkerGift[];
  selected: WorkerGift | null;
  faces: Readonly<Record<WorkerGift, Expression>>;
  /** The worker who just got a wrong job, and how many times so far. */
  worried: { gift: WorkerGift; times: number } | null;
  /** No picking while the crew works or a scene is finished. */
  locked: boolean;
  onSelect: (gift: WorkerGift) => void;
}

/** The crew: each friend with their face, name, gift, and what they can do. Drag them or tap them. */
export function TeamStrip({ workers, placed, selected, faces, worried, locked, onSelect }: TeamStripProps) {
  return (
    <ul className="flex w-full gap-story-gap @3xl:w-strip @3xl:flex-col @3xl:justify-center" aria-label="The crew">
      {workers.map((worker, index) => (
        <Card
          key={worker.gift}
          worker={worker}
          index={index}
          face={faces[worker.gift]}
          placed={placed.includes(worker.gift)}
          selected={selected === worker.gift}
          locked={locked}
          shakes={worried?.gift === worker.gift ? worried.times : 0}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
