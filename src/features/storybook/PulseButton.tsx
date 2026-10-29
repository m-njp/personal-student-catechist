"use client";

import { motion } from "motion/react";
import { readNumberToken as timing } from "@/lib/tokens";
import { bigButton } from "./styles";

/** The one big action on screen, such as Go or Next, pulsing so the class knows what comes next. */
export function PulseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      autoFocus
      onClick={onClick}
      className={`relative ${bigButton}`}
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: timing("--story-pulse-seconds"), repeat: Infinity, ease: "easeInOut" }}
    >
      {label}
    </motion.button>
  );
}
