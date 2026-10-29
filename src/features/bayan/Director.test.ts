import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bayan } from "@/content/lessons/lesson-02/bayan";
import { FIGURE_COUNT, PARTS, PLAQUE_COUNT, REVEAL_STEPS } from "./BayanRules";
import { Director, STAGE_BREAK_MS, type Promises } from "./Director";
import { questionIn, type LotId } from "./content";
import { EventBus, type BayanEvent } from "./events";
import { createProgressStore, createUiStore, type Near, type UiStore } from "./stores";

function setup(promises?: Promises) {
  const saved = createProgressStore();
  const ui = createUiStore();
  const bus = new EventBus();
  const events: BayanEvent[] = [];
  bus.on((event) => events.push(event));
  const director = new Director(bayan, saved, ui, bus, promises);
  const types = () => events.map((event) => event.type);
  return { saved, ui, bus, events, types, director };
}

const leader = (lot: LotId): Near => ({ kind: "leader", id: `leader-${lot}`, lot });

/** Plays the open conversation to its end, answering every question right. */
function playThrough(director: Director, ui: UiStore) {
  for (let step = 0; step < 100 && ui.getState().dialog; step++) {
    const dialog = ui.getState().dialog;
    if (!dialog) break;
    const beat = dialog.beats[dialog.index];
    if (beat.kind === "ask" && dialog.solved === null) {
      director.choose(questionIn(bayan, beat.set, beat.question).answer);
    } else {
      director.next();
    }
  }
  expect(ui.getState().dialog).toBeNull();
}

function beat(ui: UiStore) {
  const dialog = ui.getState().dialog;
  return dialog?.beats[dialog.index];
}

/** Talks to a lot's leaders and reads until their first question. */
function reachQuestion(director: Director, ui: UiStore, lot: LotId) {
  director.interact(leader(lot));
  while (beat(ui)?.kind === "say") director.next();
}

describe("Director, Stage 1", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays the recall card and the opening once, then marks it seen", () => {
    const { director, ui, saved } = setup();
    director.start();
    expect(ui.getState().started).toBe(true);
    expect(beat(ui)).toEqual({ kind: "card", card: bayan.recall });
    playThrough(director, ui);
    expect(saved.getState().progress.openingSeen).toBe(true);
  });

  it("greets in the leaders' own voices, then asks the first question", () => {
    const { director, ui } = setup();
    director.interact(leader("house"));
    const beats = ui.getState().dialog?.beats ?? [];
    expect(beats.slice(0, -1)).toEqual(bayan.lots.house.script.greet.map((line) => ({ kind: "say", ...line })));
    expect(beats.at(-1)).toEqual({ kind: "ask", set: "house", question: 0 });
  });

  it("will not move past a question until it is answered", () => {
    const { director, ui } = setup();
    reachQuestion(director, ui, "school");
    const index = ui.getState().dialog?.index;
    director.next();
    expect(ui.getState().dialog?.index).toBe(index);
  });

  it("gives a different nudge for each wrong choice, and changes nothing", () => {
    const { director, ui, types, saved } = setup();
    reachQuestion(director, ui, "house");
    const question = bayan.lots.house.questions[0];
    const wrongs = [0, 1, 2].filter((i) => i !== question.answer);
    director.choose(wrongs[0]);
    expect(ui.getState().dialog?.hint).toEqual(question.choices[wrongs[0]].hint);
    director.choose(wrongs[1]);
    expect(ui.getState().dialog?.tried).toEqual(wrongs);
    expect(ui.getState().dialog?.hint).toEqual(question.choices[wrongs[1]].hint);
    expect(question.choices[wrongs[0]].hint).not.toEqual(question.choices[wrongs[1]].hint);
    expect(types()).toContain("wrong");
    expect(saved.getState().progress.answered.house).toBe(0);
  });

  it("praises a right answer, then asks the next question", () => {
    const { director, ui } = setup();
    reachQuestion(director, ui, "hall");
    director.choose(bayan.lots.hall.questions[0].answer);
    director.next();
    expect(beat(ui)).toEqual({ kind: "say", ...bayan.lots.hall.questions[0].praise });
    director.next();
    expect(beat(ui)).toEqual({ kind: "ask", set: "hall", question: 1 });
  });

  it("picks up at the next question when the class comes back", () => {
    const { director, ui } = setup();
    reachQuestion(director, ui, "house");
    director.choose(bayan.lots.house.questions[0].answer);
    director.next();
    ui.setState({ dialog: null });
    director.interact(leader("house"));
    const beats = ui.getState().dialog?.beats ?? [];
    expect(beats[0]).toEqual({ kind: "say", ...bayan.lots.house.script.resume[0] });
    expect(beats.at(-1)).toEqual({ kind: "ask", set: "house", question: 1 });
  });

  it("shows the built card once the scene has raised the building", () => {
    const { director, ui, bus, saved } = setup();
    director.interact(leader("school"));
    playThrough(director, ui);
    expect(saved.getState().progress.answered.school).toBe(3);
    expect(ui.getState().built).toBeNull();
    bus.emit({ type: "built", lot: "school" });
    expect(ui.getState().built).toBe("school");
    director.closeBuilt();
    expect(ui.getState().built).toBeNull();
  });

  it("builds the church in Stage 1 like every other building", () => {
    const { director, ui, bus } = setup();
    director.interact(leader("church"));
    playThrough(director, ui);
    bus.emit({ type: "built", lot: "church" });
    expect(ui.getState().built).toBe("church");
  });

  it("closes Stage 1 after the last building's card, then begins Stage 2", () => {
    const { director, ui, bus, saved, events } = setup();
    director.start();
    playThrough(director, ui);
    for (const lot of ["church", "house", "school", "hall"] as const) {
      director.interact(leader(lot));
      playThrough(director, ui);
      bus.emit({ type: "built", lot });
      if (lot === "hall") expect(ui.getState().dialog).toBeNull();
      director.closeBuilt();
    }
    const beats = ui.getState().dialog?.beats ?? [];
    expect(beats.at(-1)).toEqual({ kind: "card", card: bayan.stages[0].end });
    playThrough(director, ui);
    expect(saved.getState().progress.stage).toBe(2);
    expect(events).toContainEqual({ type: "stage-complete", stage: 1 });
    vi.advanceTimersByTime(STAGE_BREAK_MS);
    expect(beat(ui)).toEqual({ kind: "say", speaker: bayan.guide.id, text: bayan.stages[1].start[0] });
  });

  it("shows a finished stage's closing card when the class comes back to it", () => {
    const { director, ui, saved } = setup();
    saved.setState({ progress: { ...saved.getState().progress, openingSeen: true, answered: { house: 3, school: 3, hall: 3, church: 3 } } });
    director.start();
    expect(ui.getState().dialog?.beats.at(-1)).toEqual({ kind: "card", card: bayan.stages[0].end });
  });

  it("starts over on reset", async () => {
    const { director, ui, saved, types } = setup();
    director.interact(leader("house"));
    playThrough(director, ui);
    await director.reset();
    expect(saved.getState().progress.answered.house).toBe(0);
    expect(types()).toContain("reset");
  });

  it("takes the promises down on reset, and changes nothing if that fails", async () => {
    let fail = true;
    const clear = vi.fn(async () => {
      if (fail) throw new Error("offline");
    });
    const { director, saved, types } = setup({ clear });
    director.goToStage(5);
    await expect(director.reset()).rejects.toThrow("offline");
    expect(saved.getState().progress.stage).toBe(5);

    fail = false;
    await director.reset();
    expect(clear).toHaveBeenCalledTimes(2);
    expect(saved.getState().progress.stage).toBe(1);
    expect(types()).toContain("reset");
  });

  it("restarts the current stage and keeps the earlier ones", async () => {
    const { director, saved } = setup();
    director.goToStage(3);
    director.interact({ kind: "figure", id: "pope", index: 0 });
    await director.resetStage();
    const progress = saved.getState().progress;
    expect(progress.stage).toBe(3);
    expect(progress.figuresMet).toBe(0);
    expect(progress.revealed).toBe(REVEAL_STEPS);
  });

  it("takes the promises down only when the last stage restarts", async () => {
    const clear = vi.fn(async () => {});
    const { director } = setup({ clear });
    director.goToStage(4);
    await director.resetStage();
    expect(clear).not.toHaveBeenCalled();
    director.goToStage(5);
    await director.resetStage();
    expect(clear).toHaveBeenCalledOnce();
  });
});

describe("Director, Stages 2 to 5", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reads the verse, opens the close-up, lights a part per answer, then the whole church, and moves on", () => {
    const { director, ui, saved, types } = setup();
    director.goToStage(2);
    director.interact(leader("church"));
    expect(ui.getState().dialog?.beats).toContainEqual({ kind: "card", card: { title: bayan.verse.reference, body: bayan.verse.text } });
    playThrough(director, ui);
    expect(saved.getState().progress.verseSeen).toBe(true);
    expect(ui.getState().closeUp).toBe(true);

    for (let part = 0; part < PARTS; part++) {
      director.closeCloseUp();
      expect(ui.getState().dialog?.beats.at(-1)).toEqual({ kind: "ask", set: "reveal", question: part });
      playThrough(director, ui);
      expect(saved.getState().progress.revealed).toBe(part + 1);
      expect(ui.getState().closeUp).toBe(true);
    }
    expect(types()).toContain("reveal");
    director.closeCloseUp();
    expect(saved.getState().progress.revealed).toBe(REVEAL_STEPS);
    expect(ui.getState().closeUp).toBe(true);
    director.closeCloseUp();
    expect(ui.getState().closeUp).toBe(false);
    expect(ui.getState().dialog?.beats.at(-1)).toEqual({ kind: "card", card: bayan.stages[1].end });
    playThrough(director, ui);
    expect(saved.getState().progress.stage).toBe(3);
  });

  it("opens the close-up again when the class comes back after the capstone", () => {
    const { director, ui, saved } = setup();
    director.goToStage(2);
    saved.setState({ progress: { ...saved.getState().progress, verseSeen: true, revealed: PARTS } });
    director.interact(leader("church"));
    expect(ui.getState().closeUp).toBe(true);
    director.closeCloseUp();
    expect(saved.getState().progress.revealed).toBe(REVEAL_STEPS);
  });

  it("reads St. Peter's statue in Stage 3, and only the first time counts", () => {
    const { director, ui, saved } = setup();
    director.goToStage(3);
    director.interact({ kind: "statue", id: "peter" });
    expect(beat(ui)).toEqual({ kind: "statue" });
    playThrough(director, ui);
    expect(saved.getState().progress.peterSeen).toBe(true);
  });

  it("closes the lesson with the prayer", () => {
    const { director, ui } = setup();
    director.goToStage(5);
    playThrough(director, ui);
    director.closingPrayer();
    expect(beat(ui)).toEqual({ kind: "card", card: bayan.prayer });
  });

  it("meets the Church's leaders in order", () => {
    const { director, ui, saved, events } = setup();
    director.goToStage(3);
    director.interact({ kind: "figure", id: "nuncio", index: 1 });
    expect(ui.getState().dialog).toBeNull();
    expect(events).toContainEqual({ type: "say", id: "nuncio", text: bayan.figureWait });
    for (let i = 0; i < FIGURE_COUNT; i++) {
      director.interact({ kind: "figure", id: `figure-${i}`, index: i });
      expect(beat(ui)).toEqual({ kind: "figure", index: i });
      director.next();
      expect(saved.getState().progress.figuresMet).toBe(i + 1);
    }
    expect(ui.getState().dialog?.beats.at(-1)).toEqual({ kind: "card", card: bayan.stages[2].end });
    playThrough(director, ui);
    expect(saved.getState().progress.stage).toBe(4);
  });

  it("goes in and out of the church", () => {
    const { director, ui } = setup();
    director.interact({ kind: "door", id: "church" });
    expect(ui.getState().inside).toBe(true);
    director.interact({ kind: "exit", id: "town" });
    expect(ui.getState().inside).toBe(false);
  });

  it("opens the plaques in order, and points back to the first when one is skipped", () => {
    const { director, ui, saved } = setup();
    director.goToStage(4);
    director.interact({ kind: "plaque", id: "plaque-3", index: 2 });
    expect(beat(ui)).toEqual({ kind: "say", speaker: bayan.guide.id, text: bayan.plaqueWait });
    playThrough(director, ui);
    for (let i = 0; i < PLAQUE_COUNT; i++) {
      director.interact({ kind: "plaque", id: `plaque-${i + 1}`, index: i });
      expect(beat(ui)).toEqual({ kind: "card", card: bayan.plaques[i] });
      director.next();
    }
    expect(ui.getState().dialog?.beats.at(-1)).toEqual({ kind: "card", card: bayan.stages[3].end });
    playThrough(director, ui);
    expect(saved.getState().progress.stage).toBe(5);
  });

  it("lets the teacher jump to any stage, redrawing the town at once", () => {
    const { director, saved, ui, types } = setup();
    director.start();
    director.goToStage(5);
    expect(saved.getState().progress.stage).toBe(5);
    expect(types()).toContain("reset");
    expect(beat(ui)).toEqual({ kind: "say", speaker: bayan.guide.id, text: bayan.stages[4].start[0] });
    director.goToStage(1);
    expect(saved.getState().progress.answered.house).toBe(0);
  });
});
