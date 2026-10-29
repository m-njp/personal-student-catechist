import { describe, expect, it } from "vitest";
import { greet } from "@/content/lessons/lesson-04/greet";
import { READINGS, signsOf } from "./content";

// A card sits in a column about 22rem wide beside the camera and scrolls past that, so long words crowd the timer.
const MAX_QUESTION = 75;
const MAX_CHOICE = 26;

describe("Greet the World's questions", () => {
  const { questions } = greet;

  it("start with a false statement, which the first-card tests and the guide rely on", () => {
    expect(questions[0]).toMatchObject({ kind: "trueFalse", answer: false });
  });

  it("have distinct ids", () => {
    expect(new Set(questions.map((card) => card.id)).size).toBe(questions.length);
  });

  it("fit on a card", () => {
    for (const card of questions) {
      expect(card.text.length, card.id).toBeLessThanOrEqual(MAX_QUESTION);
      if (card.kind === "choice") {
        for (const choice of card.choices) expect(choice.length, `${card.id}: ${choice}`).toBeLessThanOrEqual(MAX_CHOICE);
        // Tiles are keyed by their text.
        expect(new Set(card.choices).size, card.id).toBe(3);
      }
    }
  });

  it("give every card one sign per answer", () => {
    for (const card of questions) {
      const wanted = card.kind === "trueFalse" ? 2 : card.kind === "choice" ? 3 : 1;
      expect(new Set(signsOf(card)).size, card.id).toBe(wanted);
    }
  });

  it("name every sign with a label and a hint", () => {
    for (const card of questions) {
      for (const sign of signsOf(card)) {
        expect(greet.readings[sign].label, sign).not.toBe("");
        expect(greet.readings[sign].hint, sign).not.toBe("");
      }
    }
  });

  it("rotate through the signs, so the class does not thumb up all game", () => {
    const sets = questions.map((card) => [...signsOf(card)].sort().join());
    expect(new Set(sets).size, "no two cards share the same signs").toBe(questions.length);
    for (let i = 1; i < questions.length; i++) {
      const before = new Set(signsOf(questions[i - 1]));
      expect(signsOf(questions[i]).filter((sign) => before.has(sign)), `${questions[i - 1].id} then ${questions[i].id}`).toEqual([]);
    }
    const thumbs = questions.filter((card) => signsOf(card).some((sign) => sign === "thumbsUp" || sign === "thumbsDown"));
    expect(thumbs.length).toBeLessThanOrEqual(3);
  });

  it("show off every sign the camera reads, apart from the final round's two palms", () => {
    const used = new Set(questions.flatMap(signsOf));
    for (const reading of READINGS.filter((each) => each !== "twoOpenPalms")) expect(used.has(reading), reading).toBe(true);
  });

  it("repeat a sign rarely", () => {
    const uses = new Map<string, number>();
    for (const sign of questions.flatMap(signsOf)) uses.set(sign, (uses.get(sign) ?? 0) + 1);
    for (const [sign, count] of uses) expect(count, sign).toBeLessThanOrEqual(3);
  });

  it("never name You-jin or a country, so no card points at one person or people", () => {
    for (const card of questions) expect(JSON.stringify(card), card.id).not.toMatch(/you-?jin|korea|filipino|philippines/i);
  });
});
