import type { Person, PropId, WorkerGift } from "@/features/storybook/cast";

/** Each scene's drawing. A new scenario adds its art to scenes/index.ts and names it here. */
export type SceneId = "brigada" | "classroom" | "parish";

export interface Worker extends Person {
  gift: WorkerGift;
  /** Their tool, shown beside them while they work. */
  prop: PropId;
  /** Said when the worker is picked. */
  intro: string;
  /** What they can do, on their card in the crew. */
  can: string;
  /** Marco's praise when they get the right job. */
  praise: string;
  /** What they say while they work. */
  chatter: string;
}

export interface Job {
  gift: WorkerGift;
  /** Short, on the job's tag. */
  label: string;
}

export interface Scenario {
  art: SceneId;
  /** Shown in the teacher panel and under the stars. */
  title: string;
  /** Marco's line when the scene opens. */
  intro: string;
  /** Marco's line when every job is done. */
  done: string;
  /** Words painted on the sign once the drawing job is done. */
  sign: string;
  /** One job per worker, in any order. */
  jobs: readonly Job[];
}

/** Every word Bayanihan Crew shows. */
export interface BayanihanContent {
  title: string;
  /** Under the title on the start screen. */
  tagline: string;
  play: string;
  leader: Person & { gift: "leader" };
  workers: readonly Worker[];
  /** Marco's first line, before the first scenario's intro. */
  opening: string;
  /** Marco's nudge after a wrong match. `{picture}` becomes the job's gift picture. */
  hint: string;
  /** The picture each gift is known by, for the hint, such as "hammer". */
  pictures: Readonly<Record<WorkerGift, string>>;
  /** Marco, once every job is given. */
  ready: string;
  /** Marco, while everyone works. */
  working: string;
  go: string;
  next: string;
  /** Asked after the last scenario. */
  endQuestion: string;
  /** Read by screen readers for the stars. `{done}` and `{total}` become numbers. */
  progress: string;
  /** The teacher panel's heading for the places, and its replay button. */
  jumpTitle: string;
  replay: string;
  scenarios: readonly Scenario[];
}
