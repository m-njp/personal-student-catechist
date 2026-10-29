import type { Lesson, LessonSummary } from "@/core/lesson/Lesson";
import { lesson01 } from "./lesson-01/lesson";
import { lesson02 } from "./lesson-02/lesson";
import { lesson03 } from "./lesson-03/lesson";
import { lesson04 } from "./lesson-04/lesson";

/** Every lesson, in teaching order. Add one line per new lesson. */
export const lessons: readonly Lesson[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function lessonSummaries(): LessonSummary[] {
  return lessons.map((lesson) => lesson.toSummary());
}
