"use client";

import { motion } from "motion/react";
import { memo, useEffect, useEffectEvent, useMemo, useState } from "react";
import { giftColor, type Expression } from "@/features/storybook/cast";
import { GIFT_ICONS } from "@/features/storybook/art/icons";
import { INK, paper } from "@/features/storybook/art/paper";
import { Banderitas, Cloud } from "@/features/storybook/art/pieces";
import { Token } from "@/features/storybook/art/Token";
import { Burst } from "@/features/storybook/Burst";
import { Bobbing } from "@/features/storybook/StartScreen";
import { StoryBoard } from "@/features/storybook/StoryBoard";
import { StoryPlay, type Stage } from "@/features/storybook/StoryPlay";
import { PulseButton } from "@/features/storybook/PulseButton";
import { card } from "@/features/storybook/styles";
import { useSaved } from "@/features/storybook/useGame";
import { readNumberToken as timing } from "@/lib/tokens";
import type { Round, RoundGift } from "./content";
import type { GiftsActivity, GiftsGame } from "./GiftsActivity";
import { PICTURES } from "./pictures";
import { Puzzle } from "./Puzzle";
import { currentRound, goodFirst, letterBank, piecesPlaced, type Action } from "./rules";
import { Speller } from "./Speller";

interface GiftsPlayProps {
  activity: GiftsActivity;
  lessonId: string;
}

/** Gift Quest's board. Loaded only in the browser (see GiftsView). */
export function GiftsPlay({ activity, lessonId }: GiftsPlayProps) {
  const game = activity.gameFor(lessonId);
  const { content } = activity;
  const round = useSaved(game, (state) => currentRound(state.progress, content.rounds.length));
  const attempt = useSaved(game, (state) => state.progress.attempt);

  const cast = [
    <Bobbing key="guide" index={0}>
      <Token look={content.guide.look} gift={content.guide.gift} face="explaining" className="w-start-token" />
    </Bobbing>,
    ...content.rounds.map((r, i) => (
      <Bobbing key={r.gift} index={i + 1}>
        <GiftBadge gift={r.gift} lit />
      </Bobbing>
    )),
  ];

  return (
    <StoryPlay
      activity={activity}
      lessonId={lessonId}
      cover={{
        title: content.title,
        tagline: content.tagline,
        play: content.play,
        art: <Cover />,
        cast,
      }}
      jumpTitle={content.jumpTitle}
      jumps={content.rounds.map((r, index) => ({
        label: r.word,
        current: index === round,
        onSelect: () => game.dispatch({ type: "jump", round: index }),
      }))}
      replayLabel={content.replay}
      onReplay={() => game.dispatch({ type: "jump", round })}
    >
      {(stage) => <Board key={attempt} activity={activity} game={game} stage={stage} />}
    </StoryPlay>
  );
}

/** A fiesta sky behind the game's name. The barangay picture stays hidden until the class builds it. */
function Cover() {
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="size-full">
      <rect width="1200" height="800" fill={paper("sky")} />
      <Cloud x={220} y={180} />
      <Cloud x={960} y={260} s={0.8} />
      <Banderitas x1={0} x2={1200} y={60} sag={40} count={18} />
      <Banderitas x1={0} x2={1200} y={330} sag={30} count={16} />
      <rect y="620" width="1200" height="180" fill={paper("grass")} />
    </svg>
  );
}

/** A gift's round badge: lit in its color once found, grey before. */
function GiftBadge({ gift, lit, current = false }: { gift: RoundGift; lit: boolean; current?: boolean }) {
  const Icon = GIFT_ICONS[gift];
  return (
    <motion.span
      className={`flex size-badge items-center justify-center rounded-full border-3 border-ink shadow-story ${current ? "ring-4 ring-gold" : ""}`}
      style={{ background: lit ? giftColor(gift) : "var(--color-wash)" }}
      initial={false}
      animate={lit ? { scale: [1.4, 1], rotate: [-20, 0] } : current ? { y: ["0%", "-12%", "0%"] } : { scale: 1 }}
      transition={current && !lit ? { duration: timing("--story-pulse-seconds"), repeat: Infinity } : { type: "spring", stiffness: 300, damping: 12 }}
    >
      <Icon weight="fill" color={INK} className={`size-3/5 ${lit ? "" : "opacity-30"}`} />
    </motion.span>
  );
}

/** The four clue pictures for a gift. Drawn once per gift, not on each letter. */
const Clues = memo(function Clues({ round }: { round: Round }) {
  return (
    <ul className="grid w-clues shrink-0 grid-cols-2 gap-story-gap @3xl:w-clues-wide" aria-label="Clues">
      {round.pictures.map((picture, i) => {
        const Picture = PICTURES[picture.art];
        return (
          <motion.li
            key={picture.art}
            className="aspect-square overflow-hidden rounded-story border-3 border-ink bg-paper shadow-story"
            initial={{ opacity: 0, y: "12%" }}
            animate={{ opacity: 1, y: "0%" }}
            transition={{ delay: i * timing("--story-clue-stagger-seconds") }}
          >
            <svg viewBox="0 0 200 200" role="img" aria-label={picture.alt} className="size-full">
              <Picture />
            </svg>
          </motion.li>
        );
      })}
    </ul>
  );
});

interface BoardProps {
  activity: GiftsActivity;
  game: GiftsGame;
  stage: Stage;
}

/** One gift's round, or the ending. A new gift or a teacher restart mounts a fresh one. */
function Board({ activity, game, stage: { play, fire } }: BoardProps) {
  const { content } = activity;
  const progress = useSaved(game, (state) => state.progress);
  const index = currentRound(progress, content.rounds.length);
  const round = content.rounds[index];
  const tiles = useMemo(() => letterBank(index, round), [index, round]);
  const gifts = useMemo(() => content.rounds.map((r) => r.gift), [content.rounds]);
  const [shakes, setShakes] = useState(0);
  const [line, setLine] = useState(content.roundIntro);
  const [wrongPicks, setWrongPicks] = useState(0);
  const [arriving, setArriving] = useState<RoundGift | null>(null);
  const { phase } = progress;
  const ending = phase === "verse" || phase === "prompt";
  const placed = piecesPlaced(progress);

  /** A step, with its sound and the guide's line. */
  const act = (action: Action) => {
    const outcome = game.dispatch(action);
    if (outcome === "ignored") return;
    if (action.type === "choose") {
      if (outcome === "right") {
        play("right");
        setLine(content.goodUse);
        setArriving(round.gift);
      } else {
        play("wrong");
        setLine(content.badUse);
        setWrongPicks((n) => n + 1);
      }
    } else if (outcome === "wrong") {
      play("wrong");
      setShakes((n) => n + 1);
      setLine(content.wrongWord);
    } else if (outcome === "right") {
      play("place");
      setLine(round.found);
    } else {
      play("tap");
    }
  };

  const next = () => {
    const last = index === content.rounds.length - 1 && phase === "solved";
    game.dispatch({ type: "next" });
    if (last) {
      play("done");
      fire();
    }
  };

  // Typing works too: letters, and Backspace to take one back.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      act({ type: "backspace" });
    } else if (/^[a-z]$/i.test(event.key)) {
      act({ type: "letter", letter: event.key });
    }
  });
  useEffect(() => {
    if (phase !== "guessing") return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const said = phase === "verse" ? content.complete : phase === "prompt" ? content.writeNow : line;
  const face: Expression = ending ? "lovingGrin1" : line === content.wrongWord || line === content.badUse ? "calm" : "explaining";
  const choices = goodFirst(index) ? [true, false] : [false, true];

  return (
    <StoryBoard
      speaker={content.guide}
      face={face}
      text={said}
      label={content.progress}
      done={placed}
      total={gifts.length}
      progress={
        <div className="flex flex-wrap items-center gap-1">
          {gifts.map((gift, i) => (
            <GiftBadge key={gift} gift={gift} lit={i < placed} current={i === index && !ending && i >= placed} />
          ))}
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-story-gap overflow-y-auto @3xl:flex-row @3xl:overflow-hidden">
        <section className="flex shrink-0 flex-col items-center gap-story-gap @3xl:min-h-0 @3xl:flex-1 @3xl:shrink @3xl:justify-center">
          {ending ? (
            <motion.div
              className={`${card} flex max-w-story-card flex-col items-center gap-story-gap text-center`}
              initial={{ opacity: 0, y: "1em", rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
            >
              {phase === "verse" ? (
                <>
                  <p className="font-story text-story-title font-bold">{content.verse}</p>
                  <p className="text-story">{content.verseSource}</p>
                  <PulseButton label={content.next} onClick={next} />
                </>
              ) : (
                <p className="font-story text-story-title font-bold">{content.writingPrompt}</p>
              )}
            </motion.div>
          ) : (
            <>
              <Clues round={round} />
              <Speller
                word={round.word}
                entry={progress.entry}
                tiles={tiles}
                solved={phase !== "guessing"}
                shakes={shakes}
                hint={content.hint}
                onLetter={(letter) => act({ type: "letter", letter })}
                onBackspace={() => act({ type: "backspace" })}
                onHint={() => act({ type: "hint" })}
              />
              {phase === "choosing" && (
                <>
                  <p className="font-story text-story font-bold">{content.choicePrompt}</p>
                  <div className="grid w-full max-w-story-card grid-cols-1 gap-story-gap @lg:grid-cols-2">
                    {choices.map((good, i) => (
                      <motion.button
                        key={String(good)}
                        type="button"
                        onClick={() => act({ type: "choose", good })}
                        className={`${card} min-h-story-button text-story font-bold hover:bg-wash`}
                        initial={{ opacity: 0, y: "20%" }}
                        animate={{ opacity: 1, y: "0%" }}
                        transition={{ delay: i * timing("--story-choice-stagger-seconds") }}
                        whileHover={{ y: "-4%" }}
                        whileTap={{ scale: 0.96 }}
                      >
                        <motion.span
                          key={good ? "good" : wrongPicks}
                          className="block"
                          animate={!good && wrongPicks > 0 ? { x: ["0%", "-4%", "4%", "-2%", "0%"] } : undefined}
                        >
                          {good ? round.good : round.bad}
                        </motion.span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
              {phase === "solved" && (
                <div className="relative flex flex-col items-center gap-story-gap">
                  <motion.p
                    className={`${card} relative max-w-story-card text-story font-bold`}
                    style={{ background: giftColor(round.gift) }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {round.good}
                    <Burst color={giftColor(round.gift)} />
                  </motion.p>
                  <PulseButton label={content.next} onClick={next} />
                </div>
              )}
            </>
          )}
        </section>
        <section className="flex shrink-0 items-center justify-center @3xl:w-puzzle">
          <Puzzle
            gifts={gifts}
            placed={placed}
            arriving={arriving}
            complete={ending}
            poster={content.poster}
            alt={content.pictureAlt}
          />
        </section>
      </div>
    </StoryBoard>
  );
}
