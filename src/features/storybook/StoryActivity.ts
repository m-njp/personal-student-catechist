import { Activity, type ActivityInit } from "@/core/activity/Activity";
import { createSavedSession } from "./savedStore";
import { StoryGame, type Outcome } from "./StoryGame";
import type { SfxName } from "./useSfx";

interface StoryInit<TContent, TSound extends string> extends ActivityInit {
  content: TContent;
  sounds: Readonly<Record<TSound, string>>;
}

/** A game's rules: where it starts, how a save is checked, each step, and when it is finished. */
export interface StoryRules<TProgress, TAction, TOutcome = Outcome> {
  version: number;
  initial: () => TProgress;
  sanitize: (raw: unknown) => TProgress;
  step: (progress: TProgress, action: TAction) => [TProgress, TOutcome];
  reset: TAction;
  isDone: (progress: TProgress) => boolean;
}

/**
 * A saved game as an activity. Each game names its rules; the save and the game are made here.
 * Every game has a "select" sound, played when Play is pressed.
 */
export abstract class StoryActivity<
  TContent,
  TProgress,
  TAction,
  TOutcome = Outcome,
  TSound extends string = SfxName,
> extends Activity<TProgress> {
  readonly content: TContent;
  readonly sounds: Readonly<Record<TSound | "select", string>>;
  private game: StoryGame<TProgress, TAction, TOutcome> | null = null;
  private madeRules: StoryRules<TProgress, TAction, TOutcome> | null = null;

  constructor(init: StoryInit<TContent, TSound | "select">) {
    super(init);
    this.content = init.content;
    this.sounds = init.sounds;
  }

  protected abstract makeRules(): StoryRules<TProgress, TAction, TOutcome>;

  private get rules(): StoryRules<TProgress, TAction, TOutcome> {
    this.madeRules ??= this.makeRules();
    return this.madeRules;
  }

  /** The game and its save. Browser only, made once and kept, so coming back never duplicates it. */
  gameFor(lessonId: string): StoryGame<TProgress, TAction, TOutcome> {
    if (!this.game) {
      const rules = this.rules;
      const { store, sync } = createSavedSession({ lessonId, activityId: this.id }, rules);
      this.game = new StoryGame(store, sync, rules.step);
    }
    return this.game;
  }

  reset(): void {
    this.game?.dispatch(this.rules.reset);
  }

  isComplete(): boolean {
    return this.game ? this.rules.isDone(this.game.store.getState().progress) : false;
  }

  protected createSnapshot(): TProgress {
    return this.game?.store.getState().progress ?? this.rules.initial();
  }
}
