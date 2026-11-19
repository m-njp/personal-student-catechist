import { describe, expect, it } from "vitest";
import type { ReflectionRepository } from "./ReflectionRepository";

/** A clock that moves one second on every call. */
export function steppingClock(): () => Date {
  let t = Date.UTC(2026, 0, 1);
  return () => {
    t += 1000;
    return new Date(t);
  };
}

/** The behaviour every ReflectionRepository must have. Call it from the repository's own test. */
export function reflectionRepositoryContract(create: (now: () => Date) => ReflectionRepository) {
  describe("repository contract", () => {
    it("saves a trimmed reflection with an id and a date", async () => {
      const repo = create(steppingClock());
      const saved = await repo.save({ lessonId: "lesson-01", pupilName: "  Ana ", content: " We build together. " });
      expect(saved.id).toBeTruthy();
      expect(saved.pupilName).toBe("Ana");
      expect(saved.content).toBe("We build together.");
      expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it("lists only the asked lesson, newest first", async () => {
      const repo = create(steppingClock());
      const first = await repo.save({ lessonId: "lesson-01", pupilName: "A", content: "one" });
      await repo.save({ lessonId: "lesson-02", pupilName: "B", content: "other lesson" });
      const third = await repo.save({ lessonId: "lesson-01", pupilName: "C", content: "three" });
      const list = await repo.listByLesson("lesson-01");
      expect(list.map((r) => r.id)).toEqual([third.id, first.id]);
      expect(list[0].createdAt).toBeInstanceOf(Date);
    });

    it("lists nothing for a lesson with no reflections", async () => {
      expect(await create(steppingClock()).listByLesson("lesson-01")).toEqual([]);
    });

    it("deletes an entry", async () => {
      const repo = create(steppingClock());
      const saved = await repo.save({ lessonId: "lesson-01", pupilName: "A", content: "one" });
      await repo.delete(saved.id);
      expect(await repo.listByLesson("lesson-01")).toEqual([]);
    });

    it("refuses empty names and empty reflections", async () => {
      const repo = create(steppingClock());
      await expect(repo.save({ lessonId: "lesson-01", pupilName: " ", content: "hi" })).rejects.toThrow();
      await expect(repo.save({ lessonId: "lesson-01", pupilName: "A", content: "  " })).rejects.toThrow();
      expect(await repo.listByLesson("lesson-01")).toEqual([]);
    });

    it("saves 255 characters and refuses 256 without saving the entry", async () => {
      const repo = create(steppingClock());
      const content = "A".repeat(255);
      const saved = await repo.save({ lessonId: "lesson-01", pupilName: "Ana", content });
      expect(saved.content).toBe(content);
      await expect(repo.save({ lessonId: "lesson-01", pupilName: "Ana", content: `${content}B` })).rejects.toThrow("Your reflection is too long.");
      expect(await repo.listByLesson("lesson-01")).toHaveLength(1);
    });
  });
}
