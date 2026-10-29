import { Activity, type ActivityInit } from "@/core/activity/Activity";
import type { GreetContent } from "./content";
import type { League } from "./game/rules";
import { createGreetStore, type GreetStore } from "./game/store";

/** The short sounds: the 3, 2, 1, the timer starting, an answer, a sign passing in setup, and the finish. */
export type GreetSound = "count" | "go" | "right" | "wrong" | "pass" | "cheer";

/** Greet the World: two players at a time answer with their hands, face, and body in front of the camera. */
export class GreetActivity extends Activity<League | null> {
  static readonly TYPE = "greet-the-world";

  readonly type = GreetActivity.TYPE;
  readonly content: GreetContent;
  /** The folder under public/ with the game's models. */
  readonly assets: string;
  readonly sounds: Readonly<Record<GreetSound, string>>;
  /** The loop that plays under a match. */
  readonly music: string;
  private madeStore: GreetStore | null = null;

  constructor(
    init: ActivityInit & { content: GreetContent; assets: string; sounds: Readonly<Record<GreetSound, string>>; music: string },
  ) {
    super(init);
    this.content = init.content;
    this.assets = init.assets;
    this.sounds = init.sounds;
    this.music = init.music;
  }

  /** Browser only. Made once and kept, so leaving the lesson and coming back reuses it. */
  store(): GreetStore {
    this.madeStore ??= createGreetStore(this.content.groups, () => window.localStorage);
    return this.madeStore;
  }

  reset(): void {
    this.madeStore?.getState().dispatch({ type: "reset" });
  }

  isComplete(): boolean {
    return this.madeStore?.getState().league.played.every(Boolean) ?? false;
  }

  protected createSnapshot(): League | null {
    return this.madeStore?.getState().league ?? null;
  }
}
