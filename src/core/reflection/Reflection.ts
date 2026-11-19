/** One journal entry written by a pupil after a lesson. */
export interface Reflection {
  readonly id: string;
  readonly lessonId: string;
  readonly pupilName: string;
  readonly content: string;
  readonly createdAt: Date;
}

/** What a pupil fills in. The repository adds the id and date. */
export interface NewReflection {
  lessonId: string;
  pupilName: string;
  content: string;
}

export const REFLECTION_LIMITS = {
  nameMax: 60,
  contentMax: 255,
} as const;

/** Trims the input and checks it. Throws with a short, readable message. */
export function cleanReflection(input: NewReflection): NewReflection {
  const pupilName = input.pupilName.trim();
  const content = input.content.trim();
  if (!input.lessonId) throw new Error("Missing lesson.");
  if (!pupilName) throw new Error("Please write your name.");
  if (!content) throw new Error("Please write your reflection.");
  if (pupilName.length > REFLECTION_LIMITS.nameMax) throw new Error("Your name is too long.");
  if (content.length > REFLECTION_LIMITS.contentMax) throw new Error("Your reflection is too long.");
  return { lessonId: input.lessonId, pupilName, content };
}
