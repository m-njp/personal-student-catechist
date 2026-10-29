"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, type CSSProperties } from "react";
import { giftColor } from "@/features/storybook/cast";
import { GIFT_ICONS } from "@/features/storybook/art/icons";
import { PaperGrain } from "@/features/storybook/art/PaperDefs";
import { INK, LINE, paper } from "@/features/storybook/art/paper";
import { Burst } from "@/features/storybook/Burst";
import { readNumberToken as timing } from "@/lib/tokens";
import { BarangayPicture, CELLS, COLS, PICTURE_HEIGHT, PICTURE_WIDTH, ROWS } from "./barangay";
import type { RoundGift } from "./content";
import { piecePath } from "./jigsaw";

const CELL_WIDTH = PICTURE_WIDTH / COLS;
const CELL_HEIGHT = PICTURE_HEIGHT / ROWS;

/** Every piece's outline, worked out once. */
const PATHS = Object.fromEntries(
  Object.entries(CELLS).map(([gift, [col, row]]) => [gift, piecePath(col, row, COLS, ROWS, PICTURE_WIDTH, PICTURE_HEIGHT)]),
) as Record<RoundGift, string>;

/** Where a piece sits in the frame. */
function cellStyle(gift: RoundGift): CSSProperties {
  const [col, row] = CELLS[gift];
  return { left: `${(col / COLS) * 100}%`, top: `${(row / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` };
}

/** The piece just earned, flying in from the cards in its gift's color, then melting into the picture with a sparkle. */
function FlyingPiece({ gift }: { gift: RoundGift }) {
  const [col, row] = CELLS[gift];
  const Icon = GIFT_ICONS[gift];
  return (
    <>
      <motion.div
        className="pointer-events-none absolute z-10"
        style={cellStyle(gift)}
        initial={{ x: "-160%", y: "20%", rotate: -25, scale: 0.6, opacity: 1 }}
        animate={{ x: "0%", y: "0%", rotate: 0, scale: 1, opacity: [1, 1, 0] }}
        transition={{ duration: timing("--story-piece-seconds"), ease: "easeOut", opacity: { duration: timing("--story-melt-seconds"), times: [0, 0.6, 1] } }}
      >
        <svg
          viewBox={`${col * CELL_WIDTH} ${row * CELL_HEIGHT} ${CELL_WIDTH} ${CELL_HEIGHT}`}
          overflow="visible"
          className="size-full"
        >
          <path d={PATHS[gift]} fill={giftColor(gift)} stroke={INK} strokeWidth={LINE * 2} />
          <Icon
            x={col * CELL_WIDTH + CELL_WIDTH * 0.3}
            y={row * CELL_HEIGHT + CELL_HEIGHT * 0.3}
            width={CELL_WIDTH * 0.4}
            height={CELL_HEIGHT * 0.4}
            weight="fill"
            color={INK}
          />
        </svg>
      </motion.div>
      <motion.div
        className="pointer-events-none absolute z-10"
        style={cellStyle(gift)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: timing("--story-piece-burst-seconds") }}
      >
        <Burst color={giftColor(gift)} />
      </motion.div>
    </>
  );
}

interface PuzzleProps {
  /** Every gift's piece, in the order they are earned. */
  gifts: readonly RoundGift[];
  placed: number;
  /** The piece earned just now, which flies in. */
  arriving: RoundGift | null;
  complete: boolean;
  poster: readonly [string, string];
  alt: string;
}

/** The barangay picture in its frame. Pieces not yet earned stay grey; the whole picture glows when it is done. */
export const Puzzle = memo(function Puzzle({ gifts, placed, arriving, complete, poster, alt }: PuzzleProps) {
  return (
    <figure role="img" aria-label={alt} className="relative aspect-[3/2] w-full">
      <motion.div
        className="absolute -inset-[3%] rounded-story bg-gold"
        initial={false}
        animate={complete ? { opacity: [0.4, 1, 0.4] } : { opacity: 0 }}
        transition={complete ? { duration: timing("--story-bob-seconds"), repeat: Infinity } : { duration: timing("--story-settle-seconds") }}
      />
      <div className="absolute inset-0 overflow-hidden rounded-story border-3 border-ink bg-paper shadow-story">
        <BarangayPicture poster={poster} />
        <svg viewBox={`0 0 ${PICTURE_WIDTH} ${PICTURE_HEIGHT}`} aria-hidden className="absolute inset-0 size-full">
          <AnimatePresence>
            {gifts.slice(placed).map((gift) => (
              <motion.path
                key={gift}
                d={PATHS[gift]}
                fill={paper("stone")}
                stroke={paper("stone-dark")}
                strokeWidth={LINE * 1.5}
                exit={{ opacity: 0, transition: { delay: timing("--story-piece-reveal-seconds"), duration: timing("--story-fade-seconds") } }}
              />
            ))}
          </AnimatePresence>
        </svg>
        <PaperGrain />
      </div>
      {/* Outside the frame's edge, so it can fly in from beside the picture. */}
      {arriving && <FlyingPiece key={arriving} gift={arriving} />}
    </figure>
  );
});
