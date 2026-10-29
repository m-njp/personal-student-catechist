import { describe, expect, it } from "vitest";
import { bayan } from "@/content/lessons/lesson-02/bayan";
import {
  advance,
  allLeadersFound,
  answer,
  answerPart,
  currentQuestion,
  FIGURE_COUNT,
  initialProgress,
  jumpTo,
  leadersFound,
  meetFigure,
  nextLot,
  openPlaque,
  partQuestion,
  PARTS,
  PLAQUE_COUNT,
  REVEAL_STEPS,
  revealMore,
  sanitizeProgress,
  seePeter,
  stageGoalMet,
  visibleBuildingLayers,
  type BayanProgress,
} from "./BayanRules";
import { LOT_IDS, QUESTIONS_PER_LOT, type LotId } from "./content";

function rightAnswer(progress: BayanProgress, lot: LotId): number {
  const question = currentQuestion(progress, lot, bayan);
  if (!question) throw new Error(`No question at ${lot}.`);
  return question.answer;
}

function findLeaders(progress: BayanProgress, lot: LotId): BayanProgress {
  let next = progress;
  for (let i = 0; i < QUESTIONS_PER_LOT; i++) next = answer(next, lot, rightAnswer(next, lot), bayan).progress;
  return next;
}

describe("Stage 1 questions", () => {
  it("asks who leads, what they do, then how we help", () => {
    let progress = initialProgress();
    for (let i = 0; i < QUESTIONS_PER_LOT; i++) {
      expect(currentQuestion(progress, "house", bayan)).toBe(bayan.lots.house.questions[i]);
      progress = answer(progress, "house", rightAnswer(progress, "house"), bayan).progress;
    }
  });

  it("changes nothing on a wrong answer", () => {
    const start = initialProgress();
    const wrong = (bayan.lots.house.questions[0].answer + 1) % 3;
    expect(answer(start, "house", wrong, bayan)).toEqual({ progress: start, correct: false, done: false });
  });

  it("finds a lot's leaders only after every question is answered right", () => {
    let progress = initialProgress();
    for (let i = 0; i < QUESTIONS_PER_LOT; i++) {
      const result = answer(progress, "school", rightAnswer(progress, "school"), bayan);
      expect(result.done).toBe(i === QUESTIONS_PER_LOT - 1);
      progress = result.progress;
    }
    expect(currentQuestion(progress, "school", bayan)).toBeNull();
  });

  it("points the arrow at the next lot in order, then nowhere", () => {
    let progress = initialProgress();
    for (const lot of LOT_IDS) {
      expect(nextLot(progress)).toBe(lot);
      progress = findLeaders(progress, lot);
    }
    expect(nextLot(progress)).toBeNull();
    expect(leadersFound(progress)).toBe(4);
    expect(allLeadersFound(progress)).toBe(true);
    expect(stageGoalMet(progress)).toBe(true);
  });
});

describe("buildings", () => {
  it("starts with every site, the church's being the Lesson 01 wall", () => {
    expect(visibleBuildingLayers(initialProgress())).toEqual(["house-site", "school-site", "hall-site", "church-site"]);
  });

  it("raises a building when its leaders are found, the church too", () => {
    expect(visibleBuildingLayers(findLeaders(initialProgress(), "hall"))).toContain("hall-built");
    expect(visibleBuildingLayers(findLeaders(initialProgress(), "church"))).toContain("church-built");
  });

  it("has every building standing in Stage 2", () => {
    expect(visibleBuildingLayers(jumpTo(initialProgress(), 2))).toEqual(["house-built", "school-built", "hall-built", "church-built"]);
  });
});

describe("Stage 2: revealing the church", () => {
  it("lights one part per right answer, from the foundation to the capstone", () => {
    let progress = jumpTo(initialProgress(), 2);
    for (let part = 0; part < PARTS; part++) {
      const question = partQuestion(progress, bayan);
      expect(question).toBe(bayan.churchQuestions[part]);
      const wrong = answerPart(progress, ((question?.answer ?? 0) + 1) % 3, bayan);
      expect(wrong.progress.revealed).toBe(part);
      const result = answerPart(progress, question?.answer ?? 0, bayan);
      expect(result.done).toBe(part === PARTS - 1);
      progress = result.progress;
    }
    expect(partQuestion(progress, bayan)).toBeNull();
    expect(stageGoalMet(progress)).toBe(false);
  });

  it("then lights the whole church, which ends the stage", () => {
    const progress = revealMore({ ...jumpTo(initialProgress(), 2), revealed: PARTS });
    expect(progress.revealed).toBe(REVEAL_STEPS);
    expect(revealMore(progress)).toBe(progress);
    expect(stageGoalMet(progress)).toBe(true);
  });

  it("goes no further before the capstone, and asks nothing outside Stage 2", () => {
    const start = jumpTo(initialProgress(), 2);
    expect(revealMore(start)).toBe(start);
    expect(partQuestion(initialProgress(), bayan)).toBeNull();
  });
});

describe("Stage 3: St. Peter", () => {
  it("is read once in Stage 3, and only there", () => {
    expect(jumpTo(initialProgress(), 3).peterSeen).toBe(false);
    expect(seePeter(jumpTo(initialProgress(), 3)).peterSeen).toBe(true);
    expect(seePeter(initialProgress()).peterSeen).toBe(false);
  });
});

describe("Stages 3 and 4: in order", () => {
  it("meets the figures only in order", () => {
    let progress = jumpTo(initialProgress(), 3);
    expect(meetFigure(progress, 1)).toBe(progress);
    for (let i = 0; i < FIGURE_COUNT; i++) progress = meetFigure(progress, i);
    expect(progress.figuresMet).toBe(FIGURE_COUNT);
    expect(stageGoalMet(progress)).toBe(true);
  });

  it("opens the plaques only in order, and only in Stage 4", () => {
    expect(openPlaque(jumpTo(initialProgress(), 3), 0).plaquesOpen).toBe(0);
    let progress = jumpTo(initialProgress(), 4);
    expect(openPlaque(progress, 2)).toBe(progress);
    for (let i = 0; i < PLAQUE_COUNT; i++) progress = openPlaque(progress, i);
    expect(stageGoalMet(progress)).toBe(true);
  });
});

describe("moving between stages", () => {
  it("fills in every earlier stage, so the town matches the stage", () => {
    const progress = jumpTo(initialProgress(), 4);
    expect(progress).toMatchObject({ stage: 4, revealed: REVEAL_STEPS, verseSeen: true, peterSeen: true, figuresMet: FIGURE_COUNT, plaquesOpen: 0 });
    expect(allLeadersFound(progress)).toBe(true);
  });

  it("starts a stage fresh when jumping back", () => {
    const back = jumpTo(jumpTo(initialProgress(), 5), 2);
    expect(back).toMatchObject({ stage: 2, revealed: 0, verseSeen: false, peterSeen: false, figuresMet: 0, plaquesOpen: 0 });
    expect(allLeadersFound(back)).toBe(true);
  });

  it("advances one stage at a time and stops at the last", () => {
    let progress = initialProgress();
    for (let stage = 2; stage <= 5; stage++) {
      progress = advance(progress);
      expect(progress.stage).toBe(stage);
    }
    expect(advance(progress)).toBe(progress);
    expect(stageGoalMet(progress)).toBe(false);
  });
});

describe("sanitizeProgress", () => {
  it("keeps a good save", () => {
    const progress = jumpTo(findLeaders(initialProgress(), "house"), 3);
    expect(sanitizeProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });

  it("keeps a lot finished in an older save that asked four questions", () => {
    const old = { stage: 1, answered: { house: 4, school: 2, hall: 0, church: 0 }, church: 0, openingSeen: true, closingSeen: false };
    expect(sanitizeProgress(old).answered).toEqual({ house: 3, school: 2, hall: 0, church: 0 });
  });

  it("starts the reveal over for an older save that built the church in Stage 2", () => {
    expect(sanitizeProgress({ ...jumpTo(initialProgress(), 2), revealed: undefined, church: 2 }).revealed).toBe(0);
  });

  it("falls back to the start for anything damaged", () => {
    expect(sanitizeProgress(null)).toEqual(initialProgress());
    expect(sanitizeProgress({ stage: 9, answered: { house: -1 }, revealed: 8, peterSeen: "yes", figuresMet: 40 })).toEqual(initialProgress());
  });
});
