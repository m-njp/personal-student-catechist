"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LessonSummary } from "@/core/lesson/Lesson";
import { site } from "@/content/site";

interface SidebarProps {
  lessons: readonly LessonSummary[];
  currentLessonId: string;
}

function lessonLinks(lesson: LessonSummary) {
  const base = `/lessons/${lesson.id}`;
  return [
    { href: base, label: "Activity" },
    ...(lesson.canWriteReflection ? [{ href: `${base}/reflect`, label: "Write a reflection" }] : []),
    { href: `${base}/reflections`, label: "Read reflections" },
  ];
}

function Nav({
  lessons,
  currentLessonId,
  pathname,
  onNavigate,
}: SidebarProps & { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Lessons" className="flex flex-col gap-1">
      <p className="mb-2 text-xs font-medium text-muted">Lessons</p>
      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => {
          const current = lesson.id === currentLessonId;
          return (
            <li key={lesson.id} className={`lesson-nav-item ${current ? "lesson-nav-current" : ""}`}>
              <Link
                href={`/lessons/${lesson.id}`}
                onClick={onNavigate}
                className={`relative flex min-h-11 items-start gap-3 py-3 text-sm leading-snug ${
                  current ? "font-medium text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span className="pixel flex size-6 shrink-0 items-center justify-center bg-paper text-xs tabular-nums">{lesson.label}</span>
                <span className="min-w-0">{lesson.title}</span>
              </Link>
              {current && (
                <ul className="ml-3 flex flex-col">
                  {lessonLinks(lesson).map((link) => {
                    const active = pathname === link.href;
                    return (
                      <li key={link.href} className="lesson-nav-branch pl-5">
                        <Link
                          href={link.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-11 items-center rounded-lg px-2 text-sm ${
                            active ? "bg-wash font-medium text-ink" : "text-muted hover:bg-wash hover:text-ink"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2">
      <Image src="/logo.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="pixel text-lg leading-none text-ink">{site.name}</span>
        <span className="mt-1.5 text-xs text-muted">{site.grade}</span>
      </span>
    </Link>
  );
}

/** Lesson list: a slim column on laptops and TVs, a top bar with a small menu card on phones. */
export function Sidebar({ lessons, currentLessonId }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const current = lessons.find((lesson) => lesson.id === currentLessonId);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('a[aria-current="page"], button, a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <aside className="hidden w-sidebar shrink-0 flex-col gap-10 overflow-y-auto px-7 py-8 lg:flex">
        <Brand />
        <Nav lessons={lessons} currentLessonId={currentLessonId} pathname={pathname} />
      </aside>

      <header className="relative z-40 flex items-center justify-between gap-4 px-4 pt-3 lg:hidden">
        <Brand />
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls="lesson-menu"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline px-4 text-sm"
        >
          {current ? `Lesson ${current.label}` : "Lessons"}
          <ChevronDown aria-hidden className={`size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            {/* A tap anywhere else closes the card. */}
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 -z-10 cursor-default"
            />
            <div
              ref={menu}
              id="lesson-menu"
              className="absolute right-4 top-full mt-2 max-h-lesson-menu w-72 max-w-lesson-menu overflow-y-auto rounded-2xl border border-hairline bg-paper p-4 shadow-float"
            >
              <Nav
                lessons={lessons}
                currentLessonId={currentLessonId}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </>
        )}
      </header>
    </>
  );
}
