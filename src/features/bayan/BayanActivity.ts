import { Activity, type ActivityInit } from "@/core/activity/Activity";
import { initialProgress, LAST_STAGE, type BayanProgress } from "./BayanRules";
import type { BayanContent } from "./content";
import { createBayanSession, type BayanSession } from "./session";

export type SoundName =
  | "music"
  | "talk"
  | "blip"
  | "pop"
  | "right"
  | "wrong"
  | "sparkle"
  | "hammer"
  | "rise"
  | "build"
  | "cheer"
  | "stage"
  | "door";

/** Files under public/. Map positions live in the Tiled maps, never in code. */
export interface BayanAssets {
  townMap: string;
  churchMap: string;
  tiles: { town: string; extra: string };
  /** Sprite sheet with one row per person: standing, then a step. */
  people: string;
  /** Person name to row in the people sheet. */
  peopleIndex: string;
  /** Name to frame in the extra sheet, for markers, animals, and effects. */
  extraIndex: string;
  /** The finished buildings, one cell each in lot order, for the built card. */
  buildings: string;
  /** The jeepney's two frames. */
  vehicles: string;
  /** St. Peter's statue, shown big on its card. */
  statue: string;
  sounds: Readonly<Record<SoundName, string>>;
}

export interface BayanInit extends ActivityInit {
  content: BayanContent;
  assets: BayanAssets;
}

/**
 * Build Our Bayan: a town the class builds by finding its leaders. The rules live in BayanRules,
 * the story in Director, and the progress in a store saved to the server.
 */
export class BayanActivity extends Activity<BayanProgress> {
  static readonly TYPE = "bayan";

  readonly type = BayanActivity.TYPE;
  readonly content: BayanContent;
  readonly assets: BayanAssets;
  private session: BayanSession | null = null;

  constructor(init: BayanInit) {
    super(init);
    this.content = init.content;
    this.assets = init.assets;
  }

  /** The game's shared state. Browser only. */
  sessionFor(lessonId: string): BayanSession {
    this.session ??= createBayanSession(lessonId, this.id, this.content);
    return this.session;
  }

  reset(): void {
    this.session?.director.reset().catch(() => {
      // The promises could not be cleared, so the town was left as it was.
    });
  }

  /** The class reached the last stage, where the groups write. */
  isComplete(): boolean {
    return this.session?.saved.getState().progress.stage === LAST_STAGE;
  }

  protected createSnapshot(): BayanProgress {
    return this.session?.saved.getState().progress ?? initialProgress();
  }
}
