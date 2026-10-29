"use client";

import { useDroppable } from "@dnd-kit/core";
import { MusicNote, MusicNotes } from "@phosphor-icons/react";
import { motion, type TargetAndTransition, type Transition } from "motion/react";
import { memo, type CSSProperties, type ReactNode } from "react";
import { giftColor, type Expression, type WorkerGift } from "@/features/storybook/cast";
import { GIFT_ICONS } from "@/features/storybook/art/icons";
import { PaperGrain } from "@/features/storybook/art/PaperDefs";
import { INK } from "@/features/storybook/art/paper";
import { Prop } from "@/features/storybook/art/props";
import { Token } from "@/features/storybook/art/Token";
import { Burst } from "@/features/storybook/Burst";
import { readNumberToken as timing } from "@/lib/tokens";
import type { Timings } from "@/features/storybook/useStory";
import type { Job, Scenario, Worker } from "./content";
import type { Phase } from "./rules";
import { SCENES } from "./scenes";
import { SCENE_HEIGHT, SCENE_WIDTH, type Ambient, type Box, type Move, type SceneArt, type Spot } from "./scenes/types";

/** hop: everyone moves from the tags to their jobs. work: the mess fades. */
export type WorkStage = "hop" | "work";

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

function at({ x, y }: Spot): CSSProperties {
  return { left: pct(x, SCENE_WIDTH), top: pct(y, SCENE_HEIGHT) };
}

function boxStyle([x, y, w, h]: Box): CSSProperties {
  return { left: pct(x, SCENE_WIDTH), top: pct(y, SCENE_HEIGHT), width: pct(w, SCENE_WIDTH), height: pct(h, SCENE_HEIGHT) };
}

/** One part of the sheet as its own small picture, drawn in the sheet's units. */
function Layer({ box, children }: { box: Box; children: ReactNode }) {
  const [x, y, w, h] = box;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} overflow="visible" aria-hidden className="absolute inset-0 size-full">
      {children}
    </svg>
  );
}

/** The still background, drawn once per scene. */
const Backdrop = memo(function Backdrop({ art }: { art: SceneArt }) {
  return (
    <svg viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`} aria-hidden className="absolute inset-0 size-full">
      <art.Backdrop />
    </svg>
  );
});

const forever = { repeat: Infinity, ease: "easeInOut" } as const;

/** Each kind of movement: where it turns from, and how. */
function movements(): Record<Move, { origin: string; animate: TargetAndTransition; transition: Transition }> {
  return {
    drift: {
      origin: "50% 50%", animate: { x: ["0%", "45%", "0%"] },
      transition: { duration: timing("--story-drift-seconds"), ...forever },
    },
    sway: {
      origin: "50% 100%", animate: { rotate: [-1.6, 1.6] },
      transition: { duration: timing("--story-sway-seconds"), repeatType: "reverse", ...forever },
    },
    swing: {
      origin: "50% 0%", animate: { rotate: [-5, 5] },
      transition: { duration: timing("--story-swing-seconds"), repeatType: "reverse", ...forever },
    },
    wave: {
      origin: "0% 50%", animate: { scaleX: [1, 0.92, 1], skewY: [0, -3, 0] },
      transition: { duration: timing("--story-melt-seconds"), ...forever },
    },
    flicker: {
      origin: "50% 100%", animate: { scaleY: [1, 1.18, 0.9, 1.1, 1], opacity: [1, 0.8, 1, 0.9, 1] },
      transition: { duration: timing("--story-pulse-seconds"), ...forever },
    },
    fly: {
      origin: "50% 50%", animate: { x: ["-200%", "3000%"], y: ["0%", "-80%", "30%", "-50%"] },
      transition: {
        duration: timing("--story-fly-seconds"), repeat: Infinity,
        repeatDelay: timing("--story-bird-pause-seconds"), ease: "linear",
      },
    },
    spin: {
      origin: "50% 50%", animate: { rotate: 360 },
      transition: { duration: timing("--story-spin-seconds"), repeat: Infinity, ease: "linear" },
    },
  };
}

/** The parts of the scene that keep moving: clouds, the flag, trees, lamps, flames. Drawn once, moved by transform. */
const AmbientLayers = memo(function AmbientLayers({ ambient }: { ambient: readonly Ambient[] }) {
  const moves = movements();
  return ambient.map(({ box, move, Art }, i) => {
    const { origin, animate, transition } = moves[move];
    return (
      <motion.div
        key={i}
        className="absolute"
        style={{ ...boxStyle(box), transformOrigin: origin }}
        animate={animate}
        transition={{ ...transition, delay: i * timing("--story-ambient-stagger-seconds") }}
      >
        <Layer box={box}>
          <Art />
        </Layer>
      </motion.div>
    );
  });
});

interface JobLayersProps {
  art: SceneArt;
  sign: string;
  done: boolean;
  timings: Timings;
}

/** Each job's mess and its clean look. Still drawings: only their wrappers fade. */
const JobLayers = memo(function JobLayers({ art, sign, done, timings }: JobLayersProps) {
  return Object.values(art.jobs).map(({ box, Mess, Clean }, i) => {
    const transition = { duration: timings.work / 1000, delay: (i * timings.stagger) / 1000 };
    return (
      <div key={i}>
        {Clean && (
          <motion.div
            className="absolute"
            style={boxStyle(box)}
            initial={false}
            animate={{ opacity: done ? 1 : 0 }}
            transition={transition}
          >
            <Layer box={box}>
              <Clean sign={sign} />
            </Layer>
          </motion.div>
        )}
        {Mess && (
          <motion.div
            className="absolute"
            style={boxStyle(box)}
            initial={false}
            animate={{ opacity: done ? 0 : 1 }}
            transition={transition}
          >
            <Layer box={box}>
              <Mess />
            </Layer>
          </motion.div>
        )}
      </div>
    );
  });
});

/** How each tool moves while its worker works. */
const TOOL_MOTION: Record<WorkerGift, TargetAndTransition> = {
  hands: { y: ["0%", "-14%", "0%"] },
  building: { rotate: [-40, 12] },
  drawing: { rotate: [-25, 20], x: ["-8%", "8%"] },
  singing: { y: ["0%", "-8%", "0%"], rotate: [-8, 8] },
  tidying: { rotate: [-24, 24], x: ["-12%", "12%"] },
};

/** Music notes floating up while Dino sings. */
function Notes() {
  return [MusicNote, MusicNotes, MusicNote].map((Note, i) => (
    <motion.span
      key={i}
      aria-hidden
      className="absolute size-1/2"
      style={{ left: `${-20 + i * 45}%`, top: "-10%" }}
      initial={{ opacity: 0, y: "0%" }}
      animate={{ opacity: [0, 1, 0], y: ["0%", "-160%"], rotate: [0, i % 2 ? 15 : -15] }}
      transition={{ duration: timing("--story-notes-seconds"), repeat: Infinity, delay: i * timing("--story-note-stagger-seconds"), ease: "easeOut" }}
    >
      <Note weight="fill" color={giftColor("singing")} className="size-full" />
    </motion.span>
  ));
}

interface WorkerAtJobProps {
  worker: Worker;
  spot: Spot;
  face: Expression;
  working: boolean;
  finished: boolean;
  cheering: boolean;
  hop: number;
}

/** A worker at their job: their token, their tool moving beside them, and what they say while they work. */
function WorkerAtJob({ worker, spot, face, working, finished, cheering, hop }: WorkerAtJobProps) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={at(spot)}>
      <motion.div
        className="relative w-scene-token"
        animate={cheering ? { y: ["0%", "-40%", "0%"] } : working ? { y: ["0%", "-6%", "0%"] } : { y: "0%" }}
        transition={
          cheering ? { duration: timing("--story-cheer-seconds"), repeat: 3, ease: "easeOut" } : working ? { duration: timing("--story-work-bob-seconds"), ...forever } : { duration: timing("--story-quick-seconds") }
        }
      >
        <motion.div layoutId={`worker-${worker.gift}`} transition={{ layout: { duration: hop / 1000, ease: "easeInOut" } }}>
          <Token look={worker.look} gift={worker.gift} face={face} className="w-full" />
        </motion.div>
        {working && (
          <>
            <motion.div
              className="absolute left-[85%] top-[-10%] w-[70%]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, ...TOOL_MOTION[worker.gift] }}
              transition={{
                duration: timing("--story-shake-seconds"),
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                opacity: { duration: timing("--story-quick-seconds") },
                scale: { duration: timing("--story-quick-seconds") },
              }}
            >
              <svg viewBox="-50 -80 100 160" overflow="visible" aria-hidden className="w-full">
                <Prop id={worker.prop} />
              </svg>
              {worker.gift === "singing" && <Notes />}
            </motion.div>
            <motion.p
              className="absolute bottom-[105%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-paper px-[0.6em] font-story text-tag font-bold shadow-story"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {worker.chatter}
            </motion.p>
          </>
        )}
        {finished && <Burst color={giftColor(worker.gift)} />}
      </motion.div>
    </div>
  );
}

interface JobTagProps {
  job: Job;
  spot: Spot;
  worker: Worker;
  placed: boolean;
  /** A friend is picked, so the empty tags invite a tap. */
  armed: boolean;
  /** This job was just given, so it celebrates. */
  cheer: boolean;
  onTap: (job: WorkerGift) => void;
}

/** A job pinned to the scene: its gift's icon and color, its name, and a slot for the worker. */
const JobTag = memo(function JobTag({ job, spot, worker, placed, armed, cheer, onTap }: JobTagProps) {
  const { setNodeRef, isOver } = useDroppable({ id: job.gift, disabled: placed });
  const Icon = GIFT_ICONS[job.gift];
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onTap(job.gift)}
      disabled={placed}
      aria-label={placed ? `${job.label}: ${worker.name}` : job.label}
      className={`absolute flex w-tag -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[0.3em] text-tag transition-transform disabled:cursor-default ${
        isOver ? "scale-125" : ""
      }`}
      style={at(spot)}
    >
      <span className={`relative aspect-square w-scene-token rounded-full ${isOver ? "ring-4 ring-ink" : ""}`}>
        {placed ? (
          <motion.span
            layoutId={`worker-${worker.gift}`}
            className="block size-full"
            animate={cheer ? { scale: [1.35, 0.9, 1] } : undefined}
            transition={{ duration: timing("--story-cheer-seconds") }}
          >
            <Token look={worker.look} gift={worker.gift} face="driven" badge={false} className="size-full" />
          </motion.span>
        ) : (
          <motion.span
            className="flex size-full items-center justify-center rounded-full border-3 border-dashed border-ink shadow-story"
            style={{ background: giftColor(job.gift) }}
            animate={armed ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={armed ? { duration: timing("--story-invite-seconds"), ...forever } : { duration: timing("--story-quick-seconds") }}
          >
            <Icon weight="fill" className="size-3/5" color={INK} />
          </motion.span>
        )}
        {cheer && <Burst color={giftColor(job.gift)} />}
      </span>
      <span className="hidden rounded-full border-2 border-ink bg-paper px-[0.6em] py-[0.15em] text-center font-story font-bold leading-tight shadow-story @sm:block">
        {job.label}
      </span>
    </button>
  );
});

interface SceneProps {
  scenario: Scenario;
  workers: readonly Worker[];
  phase: Phase;
  placed: readonly WorkerGift[];
  stage: WorkStage;
  /** Workers who have finished their job, in this run of the scene. */
  finished: readonly WorkerGift[];
  armed: boolean;
  /** The job given last, which celebrates. */
  cheer: WorkerGift | null;
  timings: Timings;
  onTag: (job: WorkerGift) => void;
  children?: ReactNode;
}

/**
 * The one scene engine. It draws any scenario from its data and art: the still backdrop, the parts that
 * move, each job's mess and clean layer, the job tags, and the workers at work.
 */
export const Scene = memo(function Scene(props: SceneProps) {
  const { scenario, workers, phase, placed, stage, finished, armed, cheer, timings, onTag, children } = props;
  const art = SCENES[scenario.art];
  const settled = phase === "done" || phase === "end";
  const clean = settled || (phase === "working" && stage === "work");

  return (
    <div className="relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden rounded-story border-3 border-ink shadow-story [container-type:inline-size]">
      <Backdrop art={art} />
      <AmbientLayers ambient={art.ambient} />
      <JobLayers art={art} sign={scenario.sign} done={clean} timings={timings} />
      {phase === "assigning" &&
        scenario.jobs.map((job) => {
          const worker = workers.find((w) => w.gift === job.gift);
          return (
            worker && (
              <JobTag
                key={job.gift}
                job={job}
                spot={art.jobs[job.gift].spot}
                worker={worker}
                placed={placed.includes(job.gift)}
                armed={armed}
                cheer={cheer === job.gift}
                onTap={onTag}
              />
            )
          );
        })}
      {phase !== "assigning" &&
        workers.map((worker) => {
          const done = finished.includes(worker.gift);
          return (
            <WorkerAtJob
              key={worker.gift}
              worker={worker}
              spot={art.jobs[worker.gift].stand}
              face={settled ? "lovingGrin1" : done ? "smileBig" : "driven"}
              working={phase === "working" && stage === "work" && !done}
              finished={phase === "working" && done}
              cheering={settled}
              hop={timings.hop}
            />
          );
        })}
      <PaperGrain />
      {children}
    </div>
  );
});
