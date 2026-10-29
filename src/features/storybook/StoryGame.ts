import type { SyncedStorage } from "@/core/save/SyncedStorage";
import type { SavedStore } from "./savedStore";

/** What a step did, so the view can shake, say a line, or play a sound. */
export type Outcome = "done" | "right" | "wrong" | "ignored";

/**
 * One saved game: its store and its rules. The rules are a pure step function, so the
 * game only keeps the store in step with them. A game with richer moments names its own outcomes.
 */
export class StoryGame<TProgress, TAction, TOutcome = Outcome> {
  constructor(
    readonly store: SavedStore<TProgress>,
    readonly sync: SyncedStorage,
    private readonly rules: (progress: TProgress, action: TAction) => [TProgress, TOutcome],
  ) {}

  dispatch(action: TAction): TOutcome {
    const current = this.store.getState().progress;
    const [progress, outcome] = this.rules(current, action);
    if (progress !== current) this.store.setState({ progress });
    return outcome;
  }

  setSound(sound: boolean): void {
    this.store.setState({ sound });
  }
}
