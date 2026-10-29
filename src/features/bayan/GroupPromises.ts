import type { ReflectionRepository } from "@/core/reflection/ReflectionRepository";
import type { Promises } from "./Director";

/** The Stage 5 sentences, kept as the lesson's reflections under each group's name. */
export class GroupPromises implements Promises {
  constructor(
    private readonly repository: ReflectionRepository,
    private readonly lessonId: string,
    private readonly groups: readonly string[],
  ) {}

  /** Removes only the groups' sentences. Reflections pupils wrote themselves stay. */
  async clear(): Promise<void> {
    const entries = await this.repository.listByLesson(this.lessonId);
    await Promise.all(entries.filter((entry) => this.groups.includes(entry.pupilName)).map((entry) => this.repository.delete(entry.id)));
  }
}
