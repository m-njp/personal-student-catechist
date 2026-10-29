"use client";

import { Sparkle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { readNumberToken as timing } from "@/lib/tokens";

const SPARKS = 10;

/**
 * A ring of sparkles flying out from the middle of its parent, once. The reward for a right answer.
 * Give it a new `key` to play it again.
 */
export function Burst({ color }: { color: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        const reach = i % 2 ? 110 : 150;
        return (
          <motion.span
            key={i}
            className="absolute left-[38%] top-[38%] size-1/4"
            initial={{ x: "0%", y: "0%", scale: 0, opacity: 1 }}
            animate={{
              x: `${Math.cos(angle) * reach}%`,
              y: `${Math.sin(angle) * reach}%`,
              scale: [0, 1.2, 0.4],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: timing("--story-burst-seconds"), ease: "easeOut" }}
          >
            <Sparkle weight="fill" color={color} className="size-full" />
          </motion.span>
        );
      })}
    </span>
  );
}
