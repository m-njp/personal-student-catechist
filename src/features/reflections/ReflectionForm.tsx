"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { REFLECTION_LIMITS } from "@/core/reflection/Reflection";
import { Button } from "@/components/ui/Button";
import { useReflections } from "./useReflections";

interface ReflectionFormProps {
  lessonId: string;
  prompt: string;
  /** Openings a pupil can tap to start a sentence. */
  starters: readonly string[];
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Where a pupil writes a journal entry for this lesson. */
export function ReflectionForm({ lessonId, prompt, starters }: ReflectionFormProps) {
  const { save } = useReflections(lessonId);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const nameId = useId();
  const contentId = useId();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  function addStarter(starter: string) {
    const next = content.trim() ? `${content.trimEnd()}\n${starter} ` : `${starter} `;
    if (next.length > REFLECTION_LIMITS.contentMax) return;
    setContent(next);
    // Put the cursor at the end so the pupil can keep typing.
    requestAnimationFrame(() => {
      const box = contentRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(next.length, next.length);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "saving" });
    try {
      await save({ pupilName: name, content });
      setContent("");
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  if (status.kind === "saved") {
    return (
      <div className="animate-rise-in rounded-2xl border border-hairline p-6 sm:p-8">
        <p className="pixel text-2xl">Thank you</p>
        <p className="mt-2 text-muted">Your reflection is saved.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="solid"
            onClick={() => {
              setName("");
              setStatus({ kind: "idle" });
            }}
          >
            Next pupil
          </Button>
          <Link
            href={`/lessons/${lessonId}/reflections`}
            className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm hover:bg-wash"
          >
            Read reflections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <figure className="rounded-2xl border border-hairline p-6 sm:p-8">
        <span aria-hidden className="block font-serif text-5xl leading-none text-ink/15">
          &ldquo;
        </span>
        <p className="mt-1 font-serif text-xl leading-relaxed sm:text-2xl">{prompt}</p>
      </figure>

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-sm font-medium">
          Your name
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={REFLECTION_LIMITS.nameMax}
          autoComplete="off"
          required
          className="min-h-12 rounded-xl border border-hairline bg-paper px-4 text-base outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={contentId} className="text-sm font-medium">
          Your reflection
        </label>
        {starters.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Sentence starters">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={(content.trim() ? content.trimEnd().length + 1 : 0) + starter.length + 1 > REFLECTION_LIMITS.contentMax}
                onClick={() => addStarter(starter)}
                className="min-h-11 rounded-full border border-hairline px-4 text-left text-sm text-muted transition-colors hover:border-gold hover:text-ink disabled:cursor-default disabled:opacity-40"
              >
                {starter}...
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={contentRef}
          id={contentId}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={REFLECTION_LIMITS.contentMax}
          rows={7}
          required
          className="resize-y rounded-xl border border-hairline bg-paper px-4 py-3 font-serif text-lg leading-relaxed outline-none focus:border-gold"
        />
        <p className="text-right text-xs tabular-nums text-muted">
          {content.length} / {REFLECTION_LIMITS.contentMax}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid" disabled={status.kind === "saving"} className="min-w-28">
          {status.kind === "saving" ? "Saving" : "Save"}
        </Button>
        {status.kind === "error" && (
          <p role="alert" className="flex items-center gap-2 text-sm text-ink">
            <span aria-hidden className="inline-block size-2 rounded-full bg-coral" />
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
