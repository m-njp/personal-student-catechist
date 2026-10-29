import { describe, expect, it } from "vitest";
import { InMemoryReflectionRepository } from "@/core/reflection/InMemoryReflectionRepository";
import { GroupPromises } from "./GroupPromises";

describe("GroupPromises", () => {
  it("takes down the groups' sentences and leaves everything else", async () => {
    const repository = new InMemoryReflectionRepository();
    await repository.save({ lessonId: "lesson-02", pupilName: "Family group", content: "We promise to help." });
    await repository.save({ lessonId: "lesson-02", pupilName: "School group", content: "We promise to share." });
    await repository.save({ lessonId: "lesson-02", pupilName: "Ana", content: "I liked the town." });
    await repository.save({ lessonId: "lesson-01", pupilName: "Family group", content: "Another lesson." });

    await new GroupPromises(repository, "lesson-02", ["Family group", "School group"]).clear();

    expect((await repository.listByLesson("lesson-02")).map((entry) => entry.pupilName)).toEqual(["Ana"]);
    expect(await repository.listByLesson("lesson-01")).toHaveLength(1);
  });

  it("does nothing when there are no promises", async () => {
    await expect(new GroupPromises(new InMemoryReflectionRepository(), "lesson-02", ["Family group"]).clear()).resolves.toBeUndefined();
  });
});
