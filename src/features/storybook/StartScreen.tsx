"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { readNumberToken as timing } from "@/lib/tokens";
import { PulseButton } from "./PulseButton";

interface StartScreenProps {
  title: string;
  tagline: string;
  play: string;
  /** The game's world, faded behind the title. */
  art: ReactNode;
  /** The game's cast or badges, bobbing above the title. */
  children: ReactNode;
  onPlay: () => void;
}

/** The game's cover: its name, what to do, and one big Play that fills the screen for the TV. */
export function StartScreen({ title, tagline, play, art, children, onPlay }: StartScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-story-gap p-story-gap text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: timing("--story-cover-seconds"), ease: "easeOut" }}
      >
        {art}
      </motion.div>
      <div className="relative flex flex-wrap items-end justify-center gap-story-gap">{children}</div>
      <motion.h2
        className="relative font-story text-story-hero font-extrabold lowercase leading-none"
        initial={{ opacity: 0, y: "0.4em", rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        {title}
      </motion.h2>
      <p className="relative max-w-story-card text-story">{tagline}</p>
      <PulseButton label={play} onClick={onPlay} />
    </div>
  );
}

/** Children of the start screen bob one after another, so the cast looks alive. */
export function Bobbing({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: "40%" }}
      animate={{ opacity: 1, y: ["0%", "-10%", "0%"] }}
      transition={{
        opacity: { delay: index * timing("--story-cover-stagger-seconds") },
        y: { duration: timing("--story-bob-seconds"), repeat: Infinity, ease: "easeInOut", delay: index * timing("--story-bob-stagger-seconds") },
      }}
    >
      {children}
    </motion.div>
  );
}
