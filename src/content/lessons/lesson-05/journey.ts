import type { JourneyContent } from "@/features/journey/content";

/**
 * A Journey to Remember. Every word it shows. Questions 2 to 4 were written from each game's
 * takeaway for this recap; question 1 is the wall's own question from Lesson 1. The closing
 * question, "Who is called to be holy?", is asked aloud by the catechist, so it is not here.
 */
export const journey: JourneyContent = {
  title: "A Journey to Remember",
  tagline: "Walk back through our lessons, all the way to the Church.",
  start: "Start the journey",
  speaker: "You",
  memories: [
    {
      lesson: "Lesson 1",
      game: "Build Our Wall",
      question: "Who built this?",
      answer: "All of us, with the Holy Spirit!",
    },
    {
      lesson: "Lesson 2",
      game: "Build Our Bayan",
      question: "Who guides and unites our community?",
      answer: "Our leaders, chosen by Jesus.",
    },
    {
      lesson: "Lesson 3",
      game: "Bayanihan Crew",
      question: "How should we use our gifts?",
      answer: "To serve others, never to show off or take advantage.",
    },
    {
      lesson: "Lesson 4",
      game: "Greet the World",
      question: "Who belongs to the Church?",
      answer: "Everyone! We respect all people.",
    },
  ],
  greetings: ["Salaam!", "Jambo!", "Hallo!", "Konnichiwa!"],
  quests: {
    lola: { them: "Good morning, iho!", you: "Good morning po, Lola!" },
    ball: { them: "Thank you!", you: "Here you go!" },
    jeepney: { them: "Church stop! Simbahan!", you: "Good afternoon po!" },
    dog: { them: "Arf! Arf!", you: "Come along, buddy!" },
    garland: { them: "Sampaguita for Mama Mary?", you: "Salamat po!" },
  },
  sorbetes: "Sorbetes!",
  reveal: "Reveal the answer",
  paused: "Paused",
  controls: {
    memory: "Memory {n}",
    church: "The Church",
    pause: "Pause",
    resume: "Resume",
    restart: "Restart",
    mute: "Mute",
    unmute: "Sound on",
    fullscreen: "Full screen",
    leaveFullscreen: "Leave full screen",
    jumpTo: "Jump to",
  },
};
