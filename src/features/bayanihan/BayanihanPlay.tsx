"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { LayoutGroup } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { WORKER_GIFTS, type Expression, type WorkerGift } from "@/features/storybook/cast";
import { Token } from "@/features/storybook/art/Token";
import { Bobbing } from "@/features/storybook/StartScreen";
import { StoryBoard } from "@/features/storybook/StoryBoard";
import { StoryPlay, type Stage } from "@/features/storybook/StoryPlay";
import { PulseButton } from "@/features/storybook/PulseButton";
import { useSaved } from "@/features/storybook/useGame";
import { useTimings } from "@/features/storybook/useStory";
import type { BayanihanActivity, BayanihanGame } from "./BayanihanActivity";
import type { SceneId } from "./content";
import { CrewProgress } from "./CrewProgress";
import { allPlaced, scenesDone } from "./rules";
import { Scene, type WorkStage } from "./Scene";
import { SCENES } from "./scenes";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./scenes/types";
import { TeamStrip } from "./TeamStrip";

interface BayanihanPlayProps {
  activity: BayanihanActivity;
  lessonId: string;
}

/** Bayanihan Crew's board. Loaded only in the browser (see BayanihanView). */
export function BayanihanPlay({ activity, lessonId }: BayanihanPlayProps) {
  const game = activity.gameFor(lessonId);
  const { content } = activity;
  const scenario = useSaved(game, (state) => state.progress.scenario);
  const attempt = useSaved(game, (state) => state.progress.attempt);

  const cast = [content.leader, ...content.workers].map((person, i) => (
    <Bobbing key={person.name} index={i}>
      <Token look={person.look} gift={person.gift} face={i === 0 ? "explaining" : "smileBig"} className="w-start-token" />
    </Bobbing>
  ));

  return (
    <StoryPlay
      activity={activity}
      lessonId={lessonId}
      cover={{
        title: content.title,
        tagline: content.tagline,
        play: content.play,
        art: <Cover art={content.scenarios[0].art} />,
        cast,
      }}
      jumpTitle={content.jumpTitle}
      jumps={content.scenarios.map((s, index) => ({
        label: s.title,
        current: index === scenario,
        onSelect: () => game.dispatch({ type: "jump", scenario: index }),
      }))}
      replayLabel={content.replay}
      onReplay={() => game.dispatch({ type: "jump", scenario })}
    >
      {(stage) => <Round key={attempt} activity={activity} game={game} stage={stage} />}
    </StoryPlay>
  );
}

/** The first place, faded behind the game's name. */
function Cover({ art }: { art: SceneId }) {
  const { Backdrop } = SCENES[art];
  return (
    <svg viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`} preserveAspectRatio="xMidYMid slice" className="size-full">
      <Backdrop />
    </svg>
  );
}

/** Drag ids are the workers' and jobs' gifts. */
function asGift(id: UniqueIdentifier): WorkerGift | null {
  return WORKER_GIFTS.find((gift) => gift === id) ?? null;
}

/** Who is talking: Marco, or a friend. */
interface Line {
  speaker: "leader" | WorkerGift;
  text: string;
}

interface RoundProps {
  activity: BayanihanActivity;
  game: BayanihanGame;
  stage: Stage;
}

/** One run of one place. A new place or a teacher restart mounts a fresh one. */
function Round({ activity, game, stage: { play, fire } }: RoundProps) {
  const { content } = activity;
  const progress = useSaved(game, (state) => state.progress);
  const timings = useTimings();
  const scenario = content.scenarios[progress.scenario];
  const [firstWelcome] = useState(progress.scenario === 0 && progress.phase === "assigning" && progress.placed.length === 0);
  const [selected, setSelected] = useState<WorkerGift | null>(null);
  const [worried, setWorried] = useState<{ gift: WorkerGift; times: number } | null>(null);
  const [dragging, setDragging] = useState<WorkerGift | null>(null);
  const [cheer, setCheer] = useState<WorkerGift | null>(null);
  const [line, setLine] = useState<Line>({ speaker: "leader", text: firstWelcome ? content.opening : scenario.intro });
  const [stage, setStage] = useState<WorkStage>("hop");
  const [finished, setFinished] = useState<readonly WorkerGift[]>([]);

  // A tap must move a little before it becomes a drag, so tapping a card still picks it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // The very first place starts with Marco's welcome, then his intro.
  const toIntro = useEffectEvent(() => {
    setLine((current) => (current.text === content.opening ? { speaker: "leader", text: scenario.intro } : current));
  });
  useEffect(() => {
    if (!firstWelcome) return;
    const timer = setTimeout(toIntro, timings.opening);
    return () => clearTimeout(timer);
  }, [firstWelcome, timings.opening]);

  // A worried face goes back to a smile after a moment.
  useEffect(() => {
    if (!worried) return;
    const timer = setTimeout(() => setWorried((current) => (current === worried ? null : current)), timings.concerned);
    return () => clearTimeout(timer);
  }, [worried, timings.concerned]);

  // Go: everyone hops to their job, works while the mess fades, then the place is done.
  const finishWork = useEffectEvent(() => {
    game.dispatch({ type: "finish" });
    play("done");
    fire();
  });
  const finishOne = useEffectEvent((gift: WorkerGift) => {
    setFinished((done) => [...done, gift]);
    play("tap");
  });
  useEffect(() => {
    if (progress.phase !== "working") return;
    const timers = [setTimeout(() => setStage("work"), timings.hop)];
    content.workers.forEach((worker, i) => {
      timers.push(setTimeout(() => finishOne(worker.gift), timings.hop + timings.work + i * timings.stagger));
    });
    const total = timings.hop + timings.work + content.workers.length * timings.stagger + timings.pause;
    timers.push(setTimeout(finishWork, total));
    return () => timers.forEach(clearTimeout);
  }, [progress.phase, content.workers, timings]);

  const workerOf = (gift: WorkerGift) => content.workers.find((w) => w.gift === gift);

  const assign = (worker: WorkerGift, job: WorkerGift) => {
    const outcome = game.dispatch({ type: "assign", worker, job });
    if (outcome === "ignored") return;
    setSelected(null);
    if (outcome === "right") {
      play("place");
      setCheer(job);
      const placed = [...progress.placed, job];
      setLine({ speaker: "leader", text: allPlaced({ placed }) ? content.ready : (workerOf(job)?.praise ?? scenario.intro) });
      return;
    }
    play("wrong");
    setWorried((current) => ({ gift: worker, times: current?.gift === worker ? current.times + 1 : 1 }));
    setLine({ speaker: "leader", text: content.hint.replace("{picture}", content.pictures[job]) });
  };

  const pick = (gift: WorkerGift) => {
    if (selected === gift) {
      setSelected(null);
      setLine({ speaker: "leader", text: scenario.intro });
      return;
    }
    const worker = workerOf(gift);
    if (!worker) return;
    setSelected(gift);
    setLine({ speaker: gift, text: worker.intro });
    play("select");
  };

  // Stable callbacks that call the latest handlers, so the cards and tags only redraw when their own state changes.
  const latest = useRef({ pick, tapTag: (job: WorkerGift) => selected && assign(selected, job) });
  useLayoutEffect(() => {
    latest.current = { pick, tapTag: (job) => selected && assign(selected, job) };
  });
  const onSelect = useCallback((gift: WorkerGift) => latest.current.pick(gift), []);
  const onTag = useCallback((job: WorkerGift) => latest.current.tapTag(job), []);

  const onDragStart = ({ active }: DragStartEvent) => {
    const gift = asGift(active.id);
    setDragging(gift);
    if (gift) pick(gift);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const worker = asGift(active.id);
    const job = over ? asGift(over.id) : null;
    if (worker && job) assign(worker, job);
  };

  const go = () => {
    game.dispatch({ type: "go" });
    play("right");
    setLine({ speaker: "leader", text: content.working });
  };

  const settled = progress.phase === "done" || progress.phase === "end";
  const faces = Object.fromEntries(
    WORKER_GIFTS.map((gift): [WorkerGift, Expression] => [
      gift,
      settled ? "lovingGrin1" : worried?.gift === gift ? "concerned" : selected === gift || dragging === gift ? "calm" : "smile",
    ]),
  ) as Record<WorkerGift, Expression>;

  // A finished place and the very end belong to Marco: the done line, then the question for the class.
  const finale = progress.phase === "done" ? scenario.done : progress.phase === "end" ? content.endQuestion : null;
  const shown: Line = finale ? { speaker: "leader", text: finale } : line;
  const speaker = shown.speaker === "leader" ? content.leader : workerOf(shown.speaker);
  const speakerFace: Expression = shown.speaker === "leader" ? (settled ? "lovingGrin1" : "explaining") : faces[shown.speaker];
  const draggedWorker = dragging ? workerOf(dragging) : undefined;
  const done = scenesDone(progress);

  return (
    speaker && (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        {/* Each run of a place has its own tokens, so none fly in from where the last place left them. */}
        <LayoutGroup id={`run-${progress.attempt}`}>
          <StoryBoard
            speaker={speaker}
            face={speakerFace}
            text={shown.text}
            label={content.progress}
            done={done}
            total={content.scenarios.length}
            progress={<CrewProgress done={done} total={content.scenarios.length} title={scenario.title} placed={progress.placed} />}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-story-gap @3xl:flex-row">
              <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
                <Scene
                  scenario={scenario}
                  workers={content.workers}
                  phase={progress.phase}
                  placed={progress.placed}
                  stage={stage}
                  finished={finished}
                  armed={selected !== null}
                  cheer={cheer}
                  timings={timings}
                  onTag={onTag}
                >
                  {progress.phase === "assigning" && allPlaced(progress) && <BigButton label={content.go} onClick={go} />}
                  {progress.phase === "done" && (
                    <BigButton label={content.next} onClick={() => game.dispatch({ type: "next" })} low />
                  )}
                </Scene>
              </div>
              <TeamStrip
                workers={content.workers}
                placed={progress.placed}
                selected={selected}
                faces={faces}
                worried={worried}
                locked={progress.phase !== "assigning"}
                onSelect={onSelect}
              />
            </div>
          </StoryBoard>
          <DragOverlay>
            {draggedWorker && (
              <Token
                look={draggedWorker.look}
                gift={draggedWorker.gift}
                face="calm"
                className="w-strip-token scale-110 drop-shadow-xl"
              />
            )}
          </DragOverlay>
        </LayoutGroup>
      </DndContext>
    )
  );
}

/** The one big action over the scene: Go in the middle, Next low so the finished place shows. */
function BigButton({ label, onClick, low = false }: { label: string; onClick: () => void; low?: boolean }) {
  return (
    <div className={`absolute inset-x-0 z-10 flex justify-center ${low ? "bottom-[5%]" : "inset-y-0 items-center"}`}>
      <PulseButton label={label} onClick={onClick} />
    </div>
  );
}
