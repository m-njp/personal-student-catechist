"use client";

import { Maximize, Minimize } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { PaperDefs } from "./art/PaperDefs";
import { storyFonts } from "./fonts";
import { StartScreen } from "./StartScreen";
import type { StoryActivity } from "./StoryActivity";
import { cornerButton } from "./styles";
import { TeacherPanel, type Jump } from "./TeacherPanel";
import { useHydrated, useSaved, useSaveStatus } from "./useGame";
import { useSfx, type SfxName } from "./useSfx";
import { useConfetti } from "./useStory";

/** What a game's board gets from the shell. */
export interface Stage<TSound extends string = SfxName> {
  play: (name: TSound) => void;
  fire: (colors?: readonly string[]) => void;
}

/** The standard cover with one Play button. */
interface Cover {
  title: string;
  tagline: string;
  play: string;
  art: ReactNode;
  cast: ReactNode;
}

interface StoryPlayProps<TContent, TProgress, TAction, TOutcome, TSound extends string> {
  activity: StoryActivity<TContent, TProgress, TAction, TOutcome, TSound>;
  lessonId: string;
  /** The standard cover, or a game's own that calls `start` from its buttons. */
  cover: Cover | ((start: () => void) => ReactNode);
  jumpTitle: string;
  jumps: readonly Jump[];
  replayLabel: string;
  onReplay: () => void;
  /** Extra teacher controls, shown in the teacher panel. */
  teacher?: ReactNode;
  /** The game's own fonts, background, and text color. Lesson 03's paper board when left out. */
  look?: string;
  children: (stage: Stage<TSound | "select">) => ReactNode;
}

/**
 * Everything both Lesson 03 games share: the board they are pinned to, the cover with its Play button,
 * the teacher panel, full screen, sound, and confetti. Play fills the screen, so the TV shows only the game.
 */
export function StoryPlay<TContent, TProgress, TAction, TOutcome, TSound extends string>(
  props: StoryPlayProps<TContent, TProgress, TAction, TOutcome, TSound>,
) {
  const { activity, cover, children, look = `${storyFonts} bg-board font-story-body text-ink` } = props;
  const game = activity.gameFor(props.lessonId);
  const fullscreen = useFullscreen();
  const ready = useHydrated(game);
  const sound = useSaved(game, (state) => state.sound);
  const status = useSaveStatus(game);
  const play = useSfx(activity.sounds, sound);
  const { canvas, fire } = useConfetti();
  const [started, setStarted] = useState(false);
  const label = fullscreen.active ? "Leave full screen" : "Full screen";

  const start = () => {
    setStarted(true);
    fullscreen.enter();
    play("select");
  };

  return (
    <div
      className={
        fullscreen.active ? "fixed inset-0 z-50 bg-board" : "flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 lg:px-10 lg:pb-6"
      }
    >
      <div
        className={`${look} relative min-h-0 flex-1 overflow-hidden [container-type:size] ${
          fullscreen.active ? "size-full" : "rounded-2xl"
        }`}
      >
        <PaperDefs />
        {/* Under reduced motion, tokens jump straight to their place instead of hopping. */}
        <MotionConfig reducedMotion="user">
          {ready &&
            (started ? (
              children({ play, fire })
            ) : typeof cover === "function" ? (
              cover(start)
            ) : (
              <StartScreen title={cover.title} tagline={cover.tagline} play={cover.play} art={cover.art} onPlay={start}>
                {cover.cast}
              </StartScreen>
            ))}
        </MotionConfig>
        <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full" />
        <div className="absolute right-story-gap top-story-gap z-30 flex items-center gap-2">
          <TeacherPanel
            sound={sound}
            onSound={(on) => game.setSound(on)}
            jumpTitle={props.jumpTitle}
            jumps={props.jumps}
            replayLabel={props.replayLabel}
            onReplay={props.onReplay}
            onReset={() => activity.reset()}
            status={status}
          >
            {props.teacher}
          </TeacherPanel>
          <button
            type="button"
            aria-label={label}
            title={label}
            onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}
            className={cornerButton}
          >
            {fullscreen.active ? <Minimize aria-hidden className="size-5" /> : <Maximize aria-hidden className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
