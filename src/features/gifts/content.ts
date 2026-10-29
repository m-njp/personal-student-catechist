import type { GiftId, Person } from "@/features/storybook/cast";

/** The gifts the class guesses, each with a piece of the barangay picture. */
export type RoundGift = Exclude<GiftId, "tidying" | "leader">;

/** Each of the 24 clue pictures. Each one is drawn in pictures/. */
export type PictureArt =
  | "hands-heart"
  | "carry-water"
  | "plant-seedling"
  | "give-pandesal"
  | "music-notes"
  | "child-singing"
  | "microphone"
  | "church-choir"
  | "crayons"
  | "paintbrush"
  | "paint-poster"
  | "house-drawing"
  | "hammer-nails"
  | "fix-chair"
  | "toolbox"
  | "bahay-kubo"
  | "chalkboard-abc"
  | "read-together"
  | "book"
  | "point-board"
  | "folded-hands"
  | "rosary"
  | "kneel-church"
  | "candle";

export interface Picture {
  art: PictureArt;
  /** Read by screen readers. */
  alt: string;
}

export interface Round {
  gift: RoundGift;
  /** Capital letters only. */
  word: string;
  /** Extra letters mixed into the bank, so the word is not given away. */
  extras: string;
  pictures: readonly [Picture, Picture, Picture, Picture];
  /** The guide's line when the class spells it. */
  found: string;
  good: string;
  bad: string;
}

/** Every word Gift Quest shows. */
export interface GiftsContent {
  title: string;
  /** Under the title on the start screen. */
  tagline: string;
  play: string;
  /** Who talks the class through the game. */
  guide: Person;
  /** The guide's line at the start of each gift. */
  roundIntro: string;
  hint: string;
  wrongWord: string;
  choicePrompt: string;
  badUse: string;
  goodUse: string;
  next: string;
  /** The guide's line when the picture is whole. */
  complete: string;
  verse: string;
  verseSource: string;
  /** The guide's line before the writing card. */
  writeNow: string;
  writingPrompt: string;
  /** Read by screen readers for the barangay picture. */
  pictureAlt: string;
  /** The words on the poster in the barangay picture, one line each. */
  poster: readonly [string, string];
  /** Read by screen readers for the gift badges. `{done}` and `{total}` become numbers. */
  progress: string;
  /** The teacher panel's heading for the gifts, and its replay button. */
  jumpTitle: string;
  replay: string;
  rounds: readonly Round[];
}
