import { describe, expect, it } from "vitest";
import { Journey, TIMING, type JourneyEvent } from "./Journey";
import { cuesFor, fiestaCues, MEMORY_COUNT, QUESTS, stopX } from "./route";

function run(journey: Journey, ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) journey.tick(step);
}

/** Walks until the phase changes, or gives up after a minute of game time. */
function until(journey: Journey, phase: string) {
  for (let t = 0; t < 60_000 && journey.current !== phase; t += 16) journey.tick(16);
}

function record(journey: Journey) {
  const events: JourneyEvent[] = [];
  journey.on((event) => events.push(event));
  return events;
}

describe("starting", () => {
  it("waits on the start screen until the presenter starts", () => {
    const journey = new Journey();
    run(journey, 2000);
    expect(journey.current).toBe("title");
    expect(journey.x).toBe(0);
    journey.advance();
    expect(journey.current).toBe("walk");
  });
});

describe("walking to a memory", () => {
  it("walks by itself, stops at the first memory, and replays it", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.advance();
    until(journey, "replay");
    expect(journey.x).toBe(stopX(0, TIMING));
    expect(journey.memoryIndex).toBe(0);
    expect(events).toContainEqual({ type: "arrive", memory: 0 });
  });

  it("walks about 4 to 8 seconds between stops, not counting side quests", () => {
    for (let from = 0; from < MEMORY_COUNT; from += 1) {
      const journey = new Journey();
      journey.jump(from);
      journey.advance();
      journey.advance();
      journey.advance();
      let walking = 0;
      while (journey.current === "walk") {
        if (!journey.holding) walking += 16;
        journey.tick(16);
      }
      expect(walking).toBeGreaterThan(4000);
      expect(walking).toBeLessThan(8500);
    }
  });

  it("takes footsteps as it walks", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.advance();
    run(journey, 1000);
    expect(events.filter((event) => event.type === "step").length).toBeGreaterThan(3);
  });
});

describe("side quests", () => {
  it("pause the walk on the road, then let it go on by itself", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.advance();
    until(journey, "replay");
    const lola = QUESTS.find((quest) => quest.id === "lola");
    expect(events).toContainEqual({ type: "quest", id: "lola" });
    expect(journey.questAge("lola")).toBeGreaterThanOrEqual(lola?.holdMs ?? 0);
    expect(journey.memoryIndex).toBe(0);
  });

  it("count as already passed after a jump beyond them", () => {
    const journey = new Journey();
    journey.jump(2);
    expect(journey.questAge("lola")).not.toBeNull();
    expect(journey.questAge("ball")).not.toBeNull();
    expect(journey.questAge("dog")).toBeNull();
  });
});

describe("a memory", () => {
  it("shows its question after the replay, and waits for the presenter", () => {
    const journey = new Journey();
    journey.jump(1);
    run(journey, TIMING.replayMs + 100);
    expect(journey.current).toBe("ask");
    run(journey, 30_000);
    expect(journey.current).toBe("ask");
  });

  it("can skip the replay straight to the question", () => {
    const journey = new Journey();
    journey.jump(1);
    journey.advance();
    expect(journey.current).toBe("ask");
  });

  it("reveals the answer, then walks on by itself", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.jump(2);
    journey.advance();
    journey.advance();
    expect(journey.current).toBe("answer");
    expect(events).toContainEqual({ type: "reveal", memory: 2 });
    run(journey, TIMING.answerHoldMs + 100);
    expect(journey.current).toBe("walk");
  });

  it("walks on at once if the presenter presses again after the answer", () => {
    const journey = new Journey();
    journey.jump(0);
    journey.advance();
    journey.advance();
    journey.advance();
    expect(journey.current).toBe("walk");
  });

  it("plays every replay sound once, in order", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.jump(1);
    run(journey, TIMING.replayMs + 100);
    const cues = events.filter((event) => event.type === "cue");
    expect(cues).toHaveLength(cuesFor(1).length);
  });
});

describe("the Church", () => {
  it("is reached after the last memory, with no question", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.jump(MEMORY_COUNT - 1);
    journey.advance();
    journey.advance();
    journey.advance();
    until(journey, "end");
    expect(journey.current).toBe("end");
    expect(journey.memoryIndex).toBe(MEMORY_COUNT);
    expect(events).toContainEqual({ type: "church" });
    journey.advance();
    run(journey, 20_000);
    expect(journey.current).toBe("end");
    const sounds = events.filter((event) => event.type === "cue");
    expect(sounds).toHaveLength(fiestaCues().length);
  });
});

describe("presenter controls", () => {
  it("jumps to any memory or the Church", () => {
    const journey = new Journey();
    journey.jump(3);
    expect(journey.current).toBe("replay");
    expect(journey.x).toBe(stopX(3, TIMING));
    journey.jump(MEMORY_COUNT);
    expect(journey.current).toBe("end");
    journey.jump(0);
    expect(journey.memoryIndex).toBe(0);
  });

  it("pauses everything, and the next press resumes", () => {
    const journey = new Journey();
    journey.advance();
    run(journey, 500);
    journey.togglePause();
    const x = journey.x;
    run(journey, 3000);
    expect(journey.x).toBe(x);
    expect(journey.getSnapshot().paused).toBe(true);
    journey.advance();
    expect(journey.getSnapshot().paused).toBe(false);
    expect(journey.current).toBe("walk");
  });

  it("restarts at the start screen", () => {
    const journey = new Journey();
    journey.jump(2);
    journey.restart();
    expect(journey.current).toBe("title");
    expect(journey.x).toBe(0);
    expect(journey.memoryIndex).toBe(-1);
  });

  it("mutes and unmutes", () => {
    const journey = new Journey();
    const events = record(journey);
    journey.toggleMute();
    expect(journey.getSnapshot().muted).toBe(true);
    journey.toggleMute();
    expect(events.filter((event) => event.type === "mute")).toEqual([
      { type: "mute", muted: true },
      { type: "mute", muted: false },
    ]);
  });

  it("tells React only when something it shows changes", () => {
    const journey = new Journey();
    let changes = 0;
    journey.subscribe(() => {
      changes += 1;
    });
    journey.advance();
    run(journey, 2000);
    expect(changes).toBe(1);
  });
});
