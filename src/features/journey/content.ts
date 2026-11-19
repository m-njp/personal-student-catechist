import type { QuestId } from "./route";

/** One stop on the road: a memory of an earlier lesson and the question the pupil asks there. */
export interface JourneyMemory {
  /** For example "Lesson 1". */
  lesson: string;
  /** The earlier game's title, shown with its proper capitalization. */
  game: string;
  question: string;
  answer: string;
}

/** What a townsperson says in a side quest, and how the pupil answers. */
export interface QuestLines {
  them: string;
  you: string;
}

/** Every word A Journey to Remember shows. Lives in the lesson's content file. */
export interface JourneyContent {
  title: string;
  tagline: string;
  start: string;
  /** Who asks every question: the pupil the class is playing. */
  speaker: string;
  /** Exactly four, in lesson order. */
  memories: readonly JourneyMemory[];
  /** Said by Lesson 4's friends as the globe lights up, one each. */
  greetings: readonly string[];
  /** The small moments on the road between memories. */
  quests: Readonly<Record<QuestId, QuestLines>>;
  /** Called out now and then by the sorbetes vendor. */
  sorbetes: string;
  reveal: string;
  paused: string;
  controls: {
    memory: string;
    church: string;
    pause: string;
    resume: string;
    restart: string;
    mute: string;
    unmute: string;
    fullscreen: string;
    leaveFullscreen: string;
    jumpTo: string;
  };
}
