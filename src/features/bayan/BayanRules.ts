import { LOT_IDS, QUESTIONS_PER_LOT, type BayanContent, type LotId, type Question } from "./content";

export type Stage = 1 | 2 | 3 | 4 | 5;

export const LAST_STAGE: Stage = 5;

/**
 * Stage 2's steps on the standing church: the foundation, walls, and capstone light up, one per right
 * answer, then the whole church lights up together.
 */
export const PARTS = 3;
export const REVEAL_STEPS = 4;

/** Stage 3's leaders of the Church, met in order inside. */
export const FIGURE_COUNT = 6;
/** Stage 4's Truths to Remember, opened in order. */
export const PLAQUE_COUNT = 3;

/** Everything the class has done. Saved, so a refresh or another laptop keeps it. */
export interface BayanProgress {
  stage: Stage;
  /** Right answers given at each lot in Stage 1, from 0 to QUESTIONS_PER_LOT. */
  answered: Record<LotId, number>;
  /** Stage 2's steps done on the church, from 0 to REVEAL_STEPS. */
  revealed: number;
  openingSeen: boolean;
  /** Stage 2 opens with the verse; after that the priest goes straight to his questions. */
  verseSeen: boolean;
  /** Stage 3: St. Peter's statue is read before the church door opens. */
  peterSeen: boolean;
  figuresMet: number;
  plaquesOpen: number;
}

export function initialProgress(): BayanProgress {
  return {
    stage: 1,
    answered: { house: 0, school: 0, hall: 0, church: 0 },
    revealed: 0,
    openingSeen: false,
    verseSeen: false,
    peterSeen: false,
    figuresMet: 0,
    plaquesOpen: 0,
  };
}

/** Reads a save that came from storage or the network. Anything odd falls back to the start. */
export function sanitizeProgress(value: unknown): BayanProgress {
  const start = initialProgress();
  if (typeof value !== "object" || value === null) return start;
  const raw = value as Record<string, unknown>;
  const answered = { ...start.answered };
  const rawAnswered = (typeof raw.answered === "object" && raw.answered !== null ? raw.answered : {}) as Record<
    string,
    unknown
  >;
  // An older save asked more questions per lot; a lot it finished stays finished.
  for (const lot of LOT_IDS) answered[lot] = Math.min(wholeNumber(rawAnswered[lot], 0, 9) ?? 0, QUESTIONS_PER_LOT);
  return {
    stage: (wholeNumber(raw.stage, 1, LAST_STAGE) ?? 1) as Stage,
    answered,
    // An older save counted the church rising here instead; it starts the reveal over.
    revealed: wholeNumber(raw.revealed, 0, REVEAL_STEPS) ?? 0,
    openingSeen: raw.openingSeen === true,
    verseSeen: raw.verseSeen === true,
    peterSeen: raw.peterSeen === true,
    figuresMet: wholeNumber(raw.figuresMet, 0, FIGURE_COUNT) ?? 0,
    plaquesOpen: wholeNumber(raw.plaquesOpen, 0, PLAQUE_COUNT) ?? 0,
  };
}

function wholeNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/** Every one of the lot's questions is answered, so its leaders are found. */
export function isLotDone(progress: BayanProgress, lot: LotId): boolean {
  return progress.answered[lot] >= QUESTIONS_PER_LOT;
}

export function leadersFound(progress: BayanProgress): number {
  return LOT_IDS.filter((lot) => isLotDone(progress, lot)).length;
}

export function allLeadersFound(progress: BayanProgress): boolean {
  return leadersFound(progress) === LOT_IDS.length;
}

/** Where the guide's arrow points in Stage 1: the first lot whose leaders are not found yet. */
export function nextLot(progress: BayanProgress): LotId | null {
  if (progress.stage !== 1) return null;
  return LOT_IDS.find((lot) => !isLotDone(progress, lot)) ?? null;
}

/** The class has done what the stage asks. The last stage is open ended: groups keep writing. */
export function stageGoalMet(progress: BayanProgress): boolean {
  switch (progress.stage) {
    case 1:
      return allLeadersFound(progress);
    case 2:
      return progress.revealed === REVEAL_STEPS;
    case 3:
      return progress.figuresMet === FIGURE_COUNT;
    case 4:
      return progress.plaquesOpen === PLAQUE_COUNT;
    case 5:
      return false;
  }
}

/**
 * The town as it stands at the start of `stage`: every earlier stage done, this one and later ones
 * fresh. The teacher's stage jumps use it, so the town always matches the stage.
 */
export function jumpTo(progress: BayanProgress, stage: Stage): BayanProgress {
  const done = (s: Stage) => stage > s;
  const answered = done(1) ? { house: QUESTIONS_PER_LOT, school: QUESTIONS_PER_LOT, hall: QUESTIONS_PER_LOT, church: QUESTIONS_PER_LOT } : initialProgress().answered;
  return {
    ...initialProgress(),
    stage,
    openingSeen: progress.openingSeen || stage > 1,
    answered,
    revealed: done(2) ? REVEAL_STEPS : 0,
    verseSeen: done(2),
    peterSeen: done(3),
    figuresMet: done(3) ? FIGURE_COUNT : 0,
    plaquesOpen: done(4) ? PLAQUE_COUNT : 0,
  };
}

export function advance(progress: BayanProgress): BayanProgress {
  return progress.stage < LAST_STAGE ? jumpTo(progress, (progress.stage + 1) as Stage) : progress;
}

/** The question a lot's leader asks now, or null when there is none to ask. */
export function currentQuestion(progress: BayanProgress, lot: LotId, content: BayanContent): Question | null {
  if (progress.stage !== 1 || isLotDone(progress, lot)) return null;
  return content.lots[lot].questions[progress.answered[lot]];
}

/** In Stage 2, the question that lights the church's next part. None once all three parts are lit. */
export function partQuestion(progress: BayanProgress, content: BayanContent): Question | null {
  if (progress.stage !== 2 || progress.revealed >= PARTS) return null;
  return content.churchQuestions[progress.revealed];
}

export interface AnswerResult {
  progress: BayanProgress;
  correct: boolean;
  /** This answer finished what the leader asked: a lot's leaders found, or the church's last part lit. */
  done: boolean;
}

/** A wrong choice changes nothing, so the class can simply try again. */
export function answer(progress: BayanProgress, lot: LotId, choice: number, content: BayanContent): AnswerResult {
  const question = currentQuestion(progress, lot, content);
  if (!question || choice !== question.answer) return { progress, correct: false, done: false };
  const next = { ...progress, answered: { ...progress.answered, [lot]: progress.answered[lot] + 1 } };
  return { progress: next, correct: true, done: isLotDone(next, lot) };
}

/** Each right answer in Stage 2 lights the church's next part. */
export function answerPart(progress: BayanProgress, choice: number, content: BayanContent): AnswerResult {
  const question = partQuestion(progress, content);
  if (!question || choice !== question.answer) return { progress, correct: false, done: false };
  const revealed = progress.revealed + 1;
  return { progress: { ...progress, revealed }, correct: true, done: revealed === PARTS };
}

/** Stage 2, after the capstone: the whole church lights up. */
export function revealMore(progress: BayanProgress): BayanProgress {
  if (progress.stage !== 2 || progress.revealed < PARTS || progress.revealed >= REVEAL_STEPS) return progress;
  return { ...progress, revealed: progress.revealed + 1 };
}

/** Stage 3: the statue is read once, and opens the door. */
export function seePeter(progress: BayanProgress): BayanProgress {
  return progress.stage === 3 ? { ...progress, peterSeen: true } : progress;
}

/** Stage 3: only the next figure in line counts. */
export function meetFigure(progress: BayanProgress, index: number): BayanProgress {
  if (progress.stage !== 3 || index !== progress.figuresMet) return progress;
  return { ...progress, figuresMet: progress.figuresMet + 1 };
}

/** Stage 4: only the next plaque in line opens. */
export function openPlaque(progress: BayanProgress, index: number): BayanProgress {
  if (progress.stage !== 4 || index !== progress.plaquesOpen) return progress;
  return { ...progress, plaquesOpen: progress.plaquesOpen + 1 };
}

/** A lot is built once its leaders are found. */
export function isBuilt(progress: BayanProgress, lot: LotId): boolean {
  return isLotDone(progress, lot) || progress.stage > 1;
}

/** Names of the map's building layers to show. Every other building layer is hidden. */
export function visibleBuildingLayers(progress: BayanProgress): string[] {
  return LOT_IDS.map((lot) => (isBuilt(progress, lot) ? `${lot}-built` : `${lot}-site`));
}
