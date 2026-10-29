/** Shared looks for Lesson 03's cards and buttons, so both games match. */

/** A cut-paper card pinned over the scene. */
export const card = "rounded-story border-3 border-ink bg-paper p-story-gap shadow-story";

/** The one big action on screen, such as Go or Next. Big enough to hit while standing. */
export const bigButton =
  "inline-flex min-h-story-button items-center justify-center gap-2 rounded-full border-3 border-ink bg-gold px-8 font-story text-story font-bold text-ink shadow-story hover:bg-gold/85 disabled:opacity-50";

/** A round corner button, such as the teacher panel or full screen. */
export const cornerButton =
  "inline-flex size-11 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-story hover:bg-wash";

/** A row in the teacher panel, and the small heading over a group of rows. */
export const panelRow = "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm hover:bg-wash";
export const panelLabel = "px-3 pb-1 pt-2 text-xs uppercase tracking-label text-muted";
