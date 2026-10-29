import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { createStore, type StoreApi } from "zustand/vanilla";
import { defaultThresholds, hold, tunables, type Thresholds, type Tunable } from "../detection/config";
import { initialLeague, reduceLeague, type GroupLimits, type League, type LeagueAction } from "./rules";

export interface Settings {
  sound: boolean;
  /** The teacher plays with keys and buttons instead of the camera. */
  noCamera: boolean;
  holdMs: number;
  thresholds: Thresholds;
}

interface Saved {
  league: League;
  settings: Settings;
}

export interface GreetState extends Saved {
  resetSerial: number;
  dispatch: (action: LeagueAction) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

export type GreetStore = StoreApi<GreetState>;

/** Only scores and settings are kept, on this laptop. A turn in progress is not, so a refresh returns to the scoreboard. */
const STORAGE_KEY = "lesson-04/greet-the-world";
const VERSION = 1;

const initialSettings = (): Settings => ({ sound: true, noCamera: false, holdMs: hold.initial, thresholds: defaultThresholds });

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
const number = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function sanitizeLeague(raw: unknown, groups: GroupLimits): League {
  const { scores, played } = record(raw);
  const list = Array.isArray(scores) ? scores : [];
  const count = clamp(list.length, groups.min, groups.max);
  const playedList = Array.isArray(played) ? played : [];
  return {
    scores: Array.from({ length: count }, (_, i) => Math.max(0, Math.round(number(list[i], 0)))),
    played: Array.from({ length: count }, (_, i) => playedList[i] === true),
  };
}

function sanitizeSettings(raw: unknown): Settings {
  const { sound, noCamera, holdMs, thresholds } = record(raw);
  const saved = record(thresholds);
  const merged = { ...defaultThresholds };
  for (const key of Object.keys(defaultThresholds) as (keyof Thresholds)[]) {
    merged[key] = number(saved[key], defaultThresholds[key]);
  }
  for (const [key, range] of Object.entries(tunables) as [Tunable, (typeof tunables)[Tunable]][]) {
    merged[key] = clamp(merged[key], range.min, range.max);
  }
  return {
    sound: sound !== false,
    noCamera: noCamera === true,
    holdMs: clamp(number(holdMs, hold.initial), hold.min, hold.max),
    thresholds: merged,
  };
}

/** Turns anything read back into valid scores and settings, so an old or broken save never breaks the game. */
export function sanitize(raw: unknown, groups: GroupLimits): Saved {
  const { league, settings } = record(raw);
  return { league: sanitizeLeague(league, groups), settings: sanitizeSettings(settings) };
}

/** The game's one store. The browser passes localStorage; tests pass memory. */
export function createGreetStore(groups: GroupLimits, storage: () => StateStorage): GreetStore {
  return createStore<GreetState>()(
    persist(
      (set) => ({
        league: initialLeague(groups.min),
        settings: initialSettings(),
        resetSerial: 0,
        dispatch: (action) => set((state) => ({ league: reduceLeague(state.league, action, groups), resetSerial: state.resetSerial + (action.type === "reset" ? 1 : 0) })),
        setSettings: (patch) => set((state) => ({ settings: sanitizeSettings({ ...state.settings, ...patch }) })),
      }),
      {
        name: STORAGE_KEY,
        version: VERSION,
        // A getter, so storage that throws (a private window) leaves the game working in memory.
        storage: createJSONStorage(storage),
        partialize: ({ league, settings }) => ({ league, settings }),
        // Without migrate, zustand drops a save from another version. Passing it on lets merge keep what still fits.
        migrate: (persisted) => persisted,
        merge: (persisted, current) => ({ ...current, ...sanitize(persisted, groups) }),
      },
    ),
  );
}
