"use client";

import { DoorOpen, MessageCircle, ScrollText } from "lucide-react";
import { useCallback, useEffect } from "react";
import type { BayanContent } from "../content";
import type { BayanSession } from "../session";
import { isLocked, type Near } from "../stores";
import { useNumberToken, useUi } from "../useBayan";
import { bigButton } from "./styles";

const TALK_KEYS = ["Enter", " ", "e", "E"];

/** What the button says, and its icon, for whatever the pupil is next to. */
function labelOf(near: Near, content: BayanContent) {
  switch (near.kind) {
    case "figure":
      return { text: `Meet ${content.figures[near.index]?.title ?? near.id}`, Icon: MessageCircle };
    case "plaque":
      return { text: `Read plaque ${near.index + 1}`, Icon: ScrollText };
    case "statue":
      return { text: "Read the statue", Icon: ScrollText };
    case "door":
      return { text: "Go inside", Icon: DoorOpen };
    case "exit":
      return { text: "Go outside", Icon: DoorOpen };
    default:
      return { text: `Talk to ${content.people[near.id]?.name ?? near.id}`, Icon: MessageCircle };
  }
}

/** Big and bobbing, so pupils see it from across the room. Enter, Space, or E also works. */
export function TalkButton({ session, content }: { session: BayanSession; content: BayanContent }) {
  const near = useUi(session, (state) => state.near);
  const locked = useUi(session, isLocked);
  const show = near !== null && !locked;
  const coolMs = useNumberToken("--game-talk-cooldown-ms", 500);

  const talk = useCallback(() => {
    if (near) session.director.interact(near);
  }, [near, session]);

  useEffect(() => {
    if (!show) return;
    const onKey = (event: KeyboardEvent) => {
      if (!TALK_KEYS.includes(event.key)) return;
      // Typing in a field is the only time the key is not for talking; a focused corner button must not take it.
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      event.preventDefault();
      talk();
    };
    // Listen a moment after the button appears, so the Enter that closed a conversation does not reopen it.
    const timer = window.setTimeout(() => window.addEventListener("keydown", onKey), coolMs);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, talk, coolMs]);

  if (!show || !near) return null;
  const { text, Icon } = labelOf(near, content);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-game-gap">
      <button
        type="button"
        onClick={talk}
        className={`pointer-events-auto animate-bob ${bigButton}`}
      >
        <Icon aria-hidden className="size-6" />
        {text}
        <kbd className="hidden rounded-md border border-ink/30 px-2 text-game-small md:inline">Enter</kbd>
      </button>
    </div>
  );
}
