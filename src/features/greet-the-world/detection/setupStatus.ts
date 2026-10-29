import { READINGS, signsOf, type GreetContent, type Reading } from "../content";
import type { CameraView } from "./CameraLoop";

/** Every sign the questions ask for, and two open palms for the final round, in the setup check's order. */
export function setupSigns(content: GreetContent): readonly Reading[] {
  const used = new Set<Reading>(["twoOpenPalms", ...content.questions.flatMap(signsOf)]);
  return READINGS.filter((reading) => used.has(reading));
}

type SetupView = Pick<CameraView, "status" | "locked" | "players" | "passed">;

/** How far the setup check has come: players found, and which signs have been held. */
export function setupStatus(view: SetupView | null, signs: readonly Reading[]) {
  const passed = new Set(view?.passed);
  const remaining = signs.filter((reading) => !passed.has(reading));
  const ready = Boolean(view?.status === "running" && view.locked && view.players.length > 0 && view.players.every((player) => player.found));
  return {
    ready,
    complete: ready && remaining.length === 0,
    done: signs.length - remaining.length,
    total: signs.length,
    remaining,
  };
}
