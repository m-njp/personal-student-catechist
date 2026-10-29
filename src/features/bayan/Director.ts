import {
  advance,
  allLeadersFound,
  answer,
  answerPart,
  currentQuestion,
  initialProgress,
  isLotDone,
  jumpTo,
  LAST_STAGE,
  meetFigure,
  openPlaque,
  partQuestion,
  PARTS,
  REVEAL_STEPS,
  revealMore,
  seePeter,
  stageGoalMet,
  type BayanProgress,
  type Stage,
} from "./BayanRules";
import { questionIn, type BayanContent, type Line, type LotId } from "./content";
import type { EventBus } from "./events";
import type { Beat, Near, ProgressStore, UiStore } from "./stores";

/** Where the groups' Stage 5 promises are kept, so a reset can take them down. */
export interface Promises {
  clear(): Promise<void>;
}

/** Time for the "stage complete" banner before the next stage begins. */
export const STAGE_BREAK_MS = 2600;

/** What happens when a conversation ends. */
type Ending = "none" | "opening" | "closeUp" | "peter" | "figure" | "plaque" | "stage";

const say = (line: Line): Beat => ({ kind: "say", ...line });

/**
 * Runs the story: the opening, the leaders and their questions, the buildings rising, the close-up of
 * the church, St. Peter, the figures, the plaques, and the move from stage to stage. Plain TypeScript,
 * so it is tested without a browser. React calls it; Phaser hears about it through the bus and tells
 * it when a building is up.
 */
export class Director {
  private ending: Ending = "none";
  /** What the ending was about: the figure or plaque. */
  private subject: number | null = null;
  private stageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly content: BayanContent,
    private readonly saved: ProgressStore,
    private readonly ui: UiStore,
    private readonly bus: EventBus,
    private readonly promises?: Promises,
  ) {
    // The session lives as long as the page, and so does this listener.
    bus.on((event) => {
      if (event.type === "built") this.onBuilt(event.lot);
    });
  }

  private get progress(): BayanProgress {
    return this.saved.getState().progress;
  }

  /** The class pressed Start: play the opening the first time, or pick up where they left off. */
  start(): void {
    this.ui.setState({ started: true });
    this.bus.emit({ type: "start" });
    if (!this.progress.openingSeen) this.playOpening();
    // A refresh between finishing a stage and its closing card picks up with the card.
    else if (stageGoalMet(this.progress)) this.endStage();
  }

  playOpening(): void {
    this.open([{ kind: "card", card: this.content.recall }, ...this.guideLines(this.content.guide.opening)], "opening");
  }

  /** Stage 5: the teacher closes the lesson with the prayer. */
  closingPrayer(): void {
    this.bus.emit({ type: "pop" });
    this.open([{ kind: "card", card: this.content.prayer }], "none");
  }

  interact(near: Near): void {
    switch (near.kind) {
      case "leader":
        return near.lot === "church" && this.progress.stage === 2 ? this.talkToPriest() : this.talkToLeader(near.lot);
      case "guide":
        return this.talkToGuide();
      case "townsfolk": {
        // Builders also talk about their lot: waiting for a leader, or proud of what they built.
        const lot = near.lot ? this.content.lots[near.lot].chatter : null;
        const mood = near.lot && (isLotDone(this.progress, near.lot) || this.progress.stage > 1) ? lot?.done : lot?.waiting;
        const lines = [...(this.content.townsfolk[near.id] ?? []), ...(mood ?? [])];
        if (lines.length > 0) this.bus.emit({ type: "say", id: near.id, text: pick(lines) });
        return;
      }
      case "figure":
        return this.meet(near.id, near.index);
      case "plaque":
        return this.readPlaque(near.index);
      case "statue":
        return this.readStatue();
      case "door":
        this.bus.emit({ type: "talk" });
        return this.ui.setState({ inside: true, near: null });
      case "exit":
        this.bus.emit({ type: "talk" });
        return this.ui.setState({ inside: false, near: null });
    }
  }

  /** Moves to the next beat, or ends the conversation after the last one. */
  next(): void {
    const dialog = this.ui.getState().dialog;
    if (!dialog) return;
    const beat = dialog.beats[dialog.index];
    // A question only moves on once it is answered.
    if (beat.kind === "ask" && dialog.solved === null) return;
    if (dialog.index + 1 < dialog.beats.length) {
      this.ui.setState({ dialog: { ...dialog, index: dialog.index + 1, tried: [], hint: null, solved: null } });
      this.bus.emit({ type: "blip" });
    } else {
      this.finish();
    }
  }

  choose(choice: number): void {
    const dialog = this.ui.getState().dialog;
    const beat = dialog?.beats[dialog.index];
    if (!dialog || beat?.kind !== "ask" || dialog.solved !== null || dialog.tried.includes(choice)) return;
    const question = questionIn(this.content, beat.set, beat.question);

    const result =
      beat.set === "reveal" ? answerPart(this.progress, choice, this.content) : answer(this.progress, beat.set, choice, this.content);
    if (!result.correct) {
      const hint = question.choices[choice]?.hint ?? null;
      this.ui.setState({ dialog: { ...dialog, tried: [...dialog.tried, choice], hint } });
      this.bus.emit({ type: "wrong" });
      return;
    }
    this.setProgress(result.progress);
    const follow: Beat[] = [say(question.praise)];
    // In Stage 2 the part lights up in the close-up once the praise is read. A finished lot ends the
    // conversation instead, and the scene raises its building.
    if (beat.set === "reveal") this.ending = "closeUp";
    else if (result.done) follow.push(...this.content.lots[beat.set].script.done.map(say));
    else follow.push({ kind: "ask", set: beat.set, question: beat.question + 1 });
    this.ui.setState({
      dialog: { ...dialog, beats: [...dialog.beats.slice(0, dialog.index + 1), ...follow], hint: null, solved: choice },
    });
    this.bus.emit({ type: "correct" });
  }

  /** The class closed the built card. */
  closeBuilt(): void {
    const lot = this.ui.getState().built;
    if (!lot) return;
    this.ui.setState({ built: null });
    if (this.progress.stage === 1 && allLeadersFound(this.progress)) this.endStage();
  }

  /**
   * The class closed Stage 2's close-up of the church. Father asks about the next dark part; after
   * the capstone the whole church lights up; after that the stage closes.
   */
  closeCloseUp(): void {
    if (!this.ui.getState().closeUp) return;
    this.ui.setState({ closeUp: false });
    const progress = this.progress;
    if (progress.stage !== 2) return;
    if (progress.revealed < PARTS) {
      this.open([...this.content.church.resume.map(say), { kind: "ask", set: "reveal", question: progress.revealed }], "none");
    } else if (progress.revealed < REVEAL_STEPS) {
      this.setProgress(revealMore(progress));
      this.showCloseUp();
    } else {
      this.open([...this.content.church.done.map(say), ...this.endCard()], "stage");
    }
  }

  /** Teacher panel: start any stage, with everything before it done. */
  goToStage(stage: Stage): void {
    this.clearTimer();
    this.ending = "none";
    this.ui.setState({ dialog: null, built: null, closeUp: false, bubbles: [], inside: false, writing: false });
    this.replaceSave(jumpTo(this.progress, stage));
    if (this.ui.getState().started) this.beginStage();
  }

  /** Start the current stage over. In the last stage the groups' promises come down too. */
  async resetStage(): Promise<void> {
    const { stage } = this.progress;
    if (stage === LAST_STAGE) await this.promises?.clear();
    this.goToStage(stage);
  }

  /**
   * Back to an empty town and the opening, with every promise taken down. If the promises cannot be
   * cleared this throws and nothing changes, so the teacher can try again.
   */
  async reset(): Promise<void> {
    await this.promises?.clear();
    this.clearTimer();
    this.ending = "none";
    this.ui.setState({ dialog: null, built: null, closeUp: false, bubbles: [], inside: false, writing: false });
    this.replaceSave(initialProgress());
    if (this.ui.getState().started) this.playOpening();
  }

  /**
   * A jump or reset: while the save is marked not ready the scene ignores it, then redraws the town
   * from the new save at once instead of raising every building. The pupil goes back to the start.
   */
  private replaceSave(progress: BayanProgress) {
    const ready = this.ui.getState().ready;
    this.ui.setState({ ready: false });
    this.setProgress(progress);
    this.ui.setState({ ready });
    this.bus.emit({ type: "reset" });
  }

  private talkToLeader(lot: LotId) {
    const progress = this.progress;
    const script = this.content.lots[lot].script;
    this.bus.emit({ type: "talk" });
    if (!currentQuestion(progress, lot, this.content)) {
      this.open(script.thanks.map(say), "none");
      return;
    }
    const opening = progress.answered[lot] === 0 ? script.greet : script.resume;
    this.open([...opening.map(say), { kind: "ask", set: lot, question: progress.answered[lot] }], "none");
  }

  /** Stage 2: the verse, then the close-up of the church, then one question for each of its parts. */
  private talkToPriest() {
    const progress = this.progress;
    this.bus.emit({ type: "talk" });
    if (!progress.verseSeen) {
      this.setProgress({ ...progress, verseSeen: true });
      const { reference, text } = this.content.verse;
      this.open([...this.content.church.greet.map(say), { kind: "card", card: { title: reference, body: text } }], "closeUp");
    } else if (partQuestion(progress, this.content)) {
      this.open([...this.content.church.resume.map(say), { kind: "ask", set: "reveal", question: progress.revealed }], "none");
    } else if (progress.revealed < REVEAL_STEPS) {
      // A refresh after the capstone: the close-up picks up where it was.
      this.showCloseUp();
    } else {
      this.open(this.content.lots.church.script.thanks.map(say), "none");
    }
  }

  private showCloseUp() {
    this.ui.setState({ closeUp: true });
    if (this.progress.revealed > 0) this.bus.emit({ type: "reveal" });
  }

  private talkToGuide() {
    this.bus.emit({ type: "talk" });
    const progress = this.progress;
    const text =
      progress.stage === 1 && allLeadersFound(progress)
        ? this.content.guide.allFound[0]
        : this.content.stages[progress.stage - 1].instructions;
    this.open(this.guideLines([text]), "none");
  }

  /** Stage 3: each figure tells the class who they are, in order. Later, the class may visit again. */
  private meet(id: string, index: number) {
    const progress = this.progress;
    if (progress.stage === 3 && index > progress.figuresMet) {
      this.bus.emit({ type: "say", id, text: this.content.figureWait });
      return;
    }
    this.bus.emit({ type: "talk" });
    const first = progress.stage === 3 && index === progress.figuresMet;
    this.subject = index;
    this.open([{ kind: "figure", index }], first ? "figure" : "none");
  }

  /** Stage 3: St. Peter's statue by the door, read before going in. Later, the class may read it again. */
  private readStatue() {
    this.bus.emit({ type: "pop" });
    const first = this.progress.stage === 3 && !this.progress.peterSeen;
    this.open([{ kind: "statue" }], first ? "peter" : "none");
  }

  /** Stage 4: the plaques open in order. */
  private readPlaque(index: number) {
    const progress = this.progress;
    if (progress.stage === 4 && index > progress.plaquesOpen) {
      this.open(this.guideLines([this.content.plaqueWait]), "none");
      return;
    }
    this.bus.emit({ type: "pop" });
    const first = progress.stage === 4 && index === progress.plaquesOpen;
    this.subject = index;
    this.open([{ kind: "card", card: this.content.plaques[index] }], first ? "plaque" : "none");
  }

  private open(beats: Beat[], ending: Ending) {
    this.ending = ending;
    this.ui.setState({ dialog: { beats, index: 0, tried: [], hint: null, solved: null } });
  }

  private finish() {
    const ending = this.ending;
    const subject = this.subject;
    this.ending = "none";
    this.subject = null;
    this.ui.setState({ dialog: null });
    switch (ending) {
      case "opening":
        this.setProgress({ ...this.progress, openingSeen: true });
        return;
      case "peter":
        return this.setProgress(seePeter(this.progress));
      case "closeUp":
        return this.showCloseUp();
      case "figure":
        if (typeof subject === "number") this.setProgress(meetFigure(this.progress, subject));
        if (stageGoalMet(this.progress)) this.endStage();
        return;
      case "plaque":
        if (typeof subject === "number") this.setProgress(openPlaque(this.progress, subject));
        if (stageGoalMet(this.progress)) this.endStage();
        return;
      case "stage":
        return this.nextStage();
      default:
        return;
    }
  }

  /** The scene finished raising a building. */
  private onBuilt(lot: LotId) {
    this.ui.setState({ built: lot });
  }

  /** The guide's last words for the stage, then its closing card. Closing it moves on. */
  private endStage() {
    const lines = this.progress.stage === 1 ? this.content.guide.allFound : [];
    this.open([...this.guideLines(lines), ...this.endCard()], "stage");
  }

  private endCard(): Beat[] {
    const end = this.content.stages[this.progress.stage - 1].end;
    return end ? [{ kind: "card", card: end }] : [];
  }

  private nextStage() {
    const finished = this.progress.stage;
    this.setProgress(advance(this.progress));
    this.bus.emit({ type: "stage-complete", stage: finished });
    this.clearTimer();
    this.stageTimer = setTimeout(() => {
      this.stageTimer = null;
      this.beginStage();
    }, STAGE_BREAK_MS);
  }

  private beginStage() {
    const lines = this.progress.stage === 1 ? [] : this.content.stages[this.progress.stage - 1].start;
    if (lines.length > 0) this.open(this.guideLines(lines), "none");
  }

  private guideLines(lines: readonly string[]): Beat[] {
    const speaker = this.content.guide.id;
    return lines.map((text) => say({ speaker, text }));
  }

  private clearTimer() {
    if (this.stageTimer) clearTimeout(this.stageTimer);
    this.stageTimer = null;
  }

  private setProgress(progress: BayanProgress) {
    this.saved.setState({ progress });
  }
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
