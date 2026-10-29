"use client";

import { Delete } from "lucide-react";
import { motion } from "motion/react";
import { readNumberToken as timing } from "@/lib/tokens";
import { usedTiles } from "./rules";

interface SpellerProps {
  word: string;
  entry: string;
  tiles: readonly string[];
  /** The word is spelled, so the boxes turn green and the bank is put away. */
  solved: boolean;
  /** Goes up on each wrong word, which shakes the boxes. */
  shakes: number;
  hint: string;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onHint: () => void;
}

const box = "flex items-center justify-center rounded-xl border-3 border-ink font-story font-bold shadow-story";

/** The empty letter boxes, the scrambled letter bank, and the hint. Typing works too (see GiftsPlay). */
export function Speller({ word, entry, tiles, solved, shakes, hint, onLetter, onBackspace, onHint }: SpellerProps) {
  const used = usedTiles(entry, tiles);
  return (
    <div className="flex flex-col items-center gap-story-gap">
      <motion.div
        key={shakes}
        role="group"
        aria-label={`The gift has ${word.length} letters`}
        className="flex flex-wrap justify-center gap-[0.4em]"
        animate={shakes > 0 ? { x: ["0%", "-3%", "3%", "-2%", "2%", "0%"] } : undefined}
        transition={{ duration: timing("--story-shake-seconds") }}
      >
        {[...word].map((_, i) => (
          <motion.span
            // A new letter pops into its box; the whole word bounces green when it is right.
            key={`${i}-${entry[i] ?? ""}-${solved}`}
            className={`${box} size-letter text-story-title ${solved ? "bg-leaf" : entry[i] ? "bg-gold" : "bg-paper"}`}
            initial={solved ? { y: "0%" } : entry[i] ? { scale: 1.3 } : false}
            animate={solved ? { y: ["0%", "-35%", "0%"] } : { scale: 1 }}
            transition={solved ? { duration: timing("--story-shake-seconds"), delay: i * timing("--story-letter-stagger-seconds") } : { type: "spring", stiffness: 500, damping: 18 }}
          >
            {entry[i] ?? ""}
          </motion.span>
        ))}
      </motion.div>
      {!solved && (
        <div className="flex flex-wrap items-center justify-center gap-[0.4em]">
          {tiles.map((letter, i) => (
            <motion.button
              key={i}
              type="button"
              disabled={used[i]}
              onClick={() => onLetter(letter)}
              whileTap={{ scale: 0.85 }}
              animate={{ opacity: used[i] ? 0.25 : 1, scale: used[i] ? 0.9 : 1 }}
              className={`${box} size-tile bg-paper text-story-title hover:bg-wash`}
              aria-label={`Letter ${letter}`}
            >
              {letter}
            </motion.button>
          ))}
          <motion.button
            type="button"
            onClick={onBackspace}
            disabled={entry === ""}
            whileTap={{ scale: 0.85 }}
            className={`${box} size-tile bg-paper disabled:opacity-25`}
            aria-label="Remove a letter"
          >
            <Delete aria-hidden className="size-1/2" />
          </motion.button>
          <motion.button
            type="button"
            onClick={onHint}
            whileTap={{ scale: 0.9 }}
            className={`${box} h-tile bg-gold px-[0.6em] text-story`}
          >
            {hint}
          </motion.button>
        </div>
      )}
    </div>
  );
}
