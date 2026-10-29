import { Lesson } from "@/core/lesson/Lesson";
import { GreetActivity } from "@/features/greet-the-world/GreetActivity";
import { greet } from "./greet";

const greetSound = (file: string) => `/lessons/lesson-04/greet-the-world/sounds/${file}`;

/** Lesson 4. Everything this lesson shows lives in this folder and public/lessons/lesson-04/. */
export const lesson04 = new Lesson({
  id: "lesson-04",
  number: 4,
  title: "The Church Shares the Good News to All People",
  theme: "The Church is catholic. She is sent to all people.",
  reflectionPrompt: "How can I be a young missionary this week?",
  reflectionStarters: ["I can share the Good News by", "I will help"],
  activities: [
    new GreetActivity({
      id: "greet-the-world",
      title: greet.title,
      instructions: greet.howTo,
      content: greet,
      assets: "/lessons/lesson-04/greet-the-world",
      sounds: {
        count: greetSound("count.ogg"),
        go: greetSound("go.ogg"),
        right: greetSound("right.ogg"),
        wrong: greetSound("wrong.ogg"),
        pass: greetSound("pass.ogg"),
        cheer: greetSound("cheer.ogg"),
      },
      music: greetSound("music.wav"),
    }),
  ],
});
