import { Activity, type ActivityInit } from "@/core/activity/Activity";
import type { JourneyContent } from "./content";
import type { SoundFiles } from "./Sound";

export interface JourneyInit extends ActivityInit {
  content: JourneyContent;
  /** The folder under public/ that holds atlas.png and atlas.json. */
  art: string;
  sounds: SoundFiles;
}

/**
 * A Journey to Remember: a recap walk past a memory of each earlier lesson, ending at the Church.
 * Each showing starts fresh, so nothing is saved. The rules live in Journey.
 */
export class JourneyActivity extends Activity<null> {
  static readonly TYPE = "journey";

  readonly type = JourneyActivity.TYPE;
  readonly content: JourneyContent;
  readonly art: string;
  readonly sounds: SoundFiles;

  constructor(init: JourneyInit) {
    super(init);
    if (init.content.memories.length !== 4) throw new Error("A Journey to Remember needs exactly four memories.");
    this.content = init.content;
    this.art = init.art;
    this.sounds = init.sounds;
  }

  reset(): void {
    // Each view starts its own walk from the start screen.
  }

  isComplete(): boolean {
    return false;
  }

  protected createSnapshot(): null {
    return null;
  }
}
