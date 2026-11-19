import type { Activity } from "../activity/Activity";

export interface SongReference {
  title: string;
  url: string;
}

export interface LessonPicture {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface LessonInit {
  id: string;
  number: number;
  title: string;
  /** The big idea in one sentence. Shown beside the reflection pages. */
  theme: string;
  activities: readonly Activity[];
  /** Question pupils answer in their reflection. */
  reflectionPrompt: string;
  /** Disable the writing page for lessons that only use their game. */
  canWriteReflection?: boolean;
  /** Short openings a pupil can tap to start writing. */
  reflectionStarters?: readonly string[];
  /** Picture shown beside the reflection pages. */
  cover?: LessonPicture;
  songs?: readonly SongReference[];
}

/** Plain data the sidebar needs. Safe to pass from server to client. */
export interface LessonSummary {
  id: string;
  number: number;
  label: string;
  title: string;
  canWriteReflection: boolean;
}

/** A lesson: its details and the activities in the order they run. */
export class Lesson {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly theme: string;
  readonly activities: readonly Activity[];
  readonly reflectionPrompt: string;
  readonly canWriteReflection: boolean;
  readonly reflectionStarters: readonly string[];
  readonly cover?: LessonPicture;
  readonly songs: readonly SongReference[];

  constructor(init: LessonInit) {
    if (init.activities.length === 0) {
      throw new Error(`Lesson "${init.id}" needs at least one activity.`);
    }
    this.id = init.id;
    this.number = init.number;
    this.title = init.title;
    this.theme = init.theme;
    this.activities = init.activities;
    this.reflectionPrompt = init.reflectionPrompt;
    this.canWriteReflection = init.canWriteReflection ?? true;
    this.reflectionStarters = init.reflectionStarters ?? [];
    this.cover = init.cover;
    this.songs = init.songs ?? [];
  }

  /** Two digit label, for example "01". */
  get label(): string {
    return String(this.number).padStart(2, "0");
  }

  toSummary(): LessonSummary {
    return { id: this.id, number: this.number, label: this.label, title: this.title, canWriteReflection: this.canWriteReflection };
  }
}
