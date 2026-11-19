"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useReflections } from "./useReflections";

interface ReflectionCardsProps {
  lessonId: string;
  canWrite: boolean;
  /** Shown beside the cards on wide screens, with the live count under it. */
  aside: ReactNode;
}

/** The teacher's view: every entry for the lesson as quiet quote cards, newest first. No names shown. */
export function ReflectionCards({ lessonId, canWrite, aside }: ReflectionCardsProps) {
  const { entries, error, remove } = useReflections(lessonId, { list: true });
  const count = entries?.length ?? 0;

  let body: ReactNode;
  if (error) {
    body = <p className="text-muted">{error}</p>;
  } else if (!entries) {
    body = <p className="text-muted">Loading</p>;
  } else if (entries.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-hairline px-6 py-12 text-center">
        <span aria-hidden className="font-serif text-6xl leading-none text-ink/15">
          &ldquo;
        </span>
        <p className="text-muted">No reflections yet.</p>
        {canWrite && <Link
          href={`/lessons/${lessonId}/reflect`}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper hover:bg-ink/85"
        >
          Write the first one
        </Link>}
      </div>
    );
  } else {
    body = (
      <ul className="columns-1 gap-3 sm:columns-2 lg:columns-1 xl:columns-2 2xl:columns-3">
        {entries.map((entry) => (
          <li key={entry.id} className="mb-3 break-inside-avoid">
            <figure className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
              {/* Quote mark and remove button share the top row, so the card stays compact. */}
              <div className="-mr-2 -mt-2 flex items-start justify-between">
                <span aria-hidden className="pt-2 font-serif text-4xl leading-none text-ink/15">
                  &ldquo;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Remove this reflection?")) return;
                    remove(entry.id).catch(() => window.alert("Could not remove it. Please try again."));
                  }}
                  aria-label="Remove this reflection"
                  title="Remove"
                  className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-wash hover:text-coral"
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
              </div>
              <blockquote className="whitespace-pre-line break-words font-serif text-lg leading-relaxed lg:text-xl">
                {entry.content}
              </blockquote>
            </figure>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:order-last lg:w-aside lg:shrink-0">
        {aside}
        <div className="flex items-baseline gap-3 rounded-2xl bg-wash px-5 py-4" aria-live="polite">
          <span className="pixel text-stat tabular-nums">{count}</span>
          <span className="text-sm text-muted">{count === 1 ? "reflection so far" : "reflections so far"}</span>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{body}</div>
    </div>
  );
}
