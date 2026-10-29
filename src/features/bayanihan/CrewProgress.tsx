"use client";

import { Star } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { giftColor, WORKER_GIFTS, type WorkerGift } from "@/features/storybook/cast";
import { INK } from "@/features/storybook/art/paper";

interface CrewProgressProps {
  /** Places finished, one star each. */
  done: number;
  total: number;
  /** The place on screen. */
  title: string;
  /** Jobs given in this place, as pips in each gift's color. */
  placed: readonly WorkerGift[];
}

/** How far the crew has come: a star for each place finished, and a pip for each job given here. */
export function CrewProgress({ done, total, title, placed }: CrewProgressProps) {
  return (
    <div className="flex flex-col items-start gap-1 @3xl:items-center">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={`${i}-${i < done}`}
            className="block size-progress"
            initial={i < done ? { scale: 0, rotate: -90 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 12 }}
          >
            <Star weight={i < done ? "fill" : "bold"} color={i < done ? "var(--color-gold)" : INK} className="size-full" />
          </motion.span>
        ))}
      </div>
      <p className="font-story text-story-small font-bold leading-none">{title}</p>
      <div className="flex gap-1" aria-hidden>
        {WORKER_GIFTS.map((gift) => (
          <motion.span
            key={gift}
            className="block size-pip rounded-full border-2 border-ink"
            animate={{
              backgroundColor: placed.includes(gift) ? giftColor(gift) : "var(--color-paper)",
              scale: placed.includes(gift) ? [1.5, 1] : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
