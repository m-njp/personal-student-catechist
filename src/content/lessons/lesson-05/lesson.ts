import { Lesson } from "@/core/lesson/Lesson";
import { JourneyActivity } from "@/features/journey/JourneyActivity";
import { journey } from "./journey";

const art = "/lessons/lesson-05/journey";
const sound = (file: string) => `${art}/sounds/${file}.wav`;

/** Lesson 5. Everything this lesson shows lives in this folder and public/lessons/lesson-05/. */
export const lesson05 = new Lesson({
  id: "lesson-05",
  number: 5,
  title: "The Church Is Holy",
  theme: "All of us are called to be holy.",
  // Draft for the teacher to review.
  reflectionPrompt: "How can you grow in holiness this week?",
  reflectionStarters: ["I can be holy by", "This week I will"],
  activities: [
    new JourneyActivity({
      id: "a-journey-to-remember",
      title: journey.title,
      instructions: "Walk back through our lessons, and answer each memory's question together.",
      content: journey,
      art,
      sounds: {
        music: sound("music"),
        ending: sound("ending"),
        memory: sound("memory"),
        whoosh: sound("whoosh"),
        ask: sound("ask"),
        reveal: sound("reveal"),
        fanfare: sound("fanfare"),
        cheer: sound("cheer"),
        pop: sound("pop"),
        brick: sound("brick"),
        hammer: sound("hammer"),
        rise: sound("rise"),
        bell: sound("bell"),
        sparkle: sound("sparkle"),
        "step-0": sound("step-0"),
        "step-1": sound("step-1"),
        horn: sound("horn"),
        engine: sound("engine"),
        bark: sound("bark"),
        cluck: sound("cluck"),
        handbell: sound("handbell"),
        bounce: sound("bounce"),
        chirp: sound("chirp"),
        firework: sound("firework"),
      },
    }),
  ],
});
