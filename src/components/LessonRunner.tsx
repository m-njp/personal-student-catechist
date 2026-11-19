"use client";

import { createElement, useState } from "react";
import { activityRegistry } from "@/core/activity/ActivityRegistry";
import { getLesson } from "@/content/lessons";
import { Segmented } from "@/components/ui/Segmented";
import { SongNote } from "@/components/ui/SongNote";
import "@/features";

/** Shows a lesson's activities. Looks the lesson up here because class instances cannot cross from server to client. */
export function LessonRunner({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId);
  const [index, setIndex] = useState(0);
  if (!lesson) return null;

  const activity = lesson.activities[Math.min(index, lesson.activities.length - 1)];
  // The registry hands back a stable, module-level component for this activity type.
  const view = createElement(activityRegistry.resolve(activity), { key: activity.id, activity, lesson });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pt-4 lg:px-10 lg:pt-6">
        <div className="min-w-0">
          <p className="text-xs tracking-label text-muted">Lesson {lesson.label}</p>
          <h1 className="pixel mt-1 text-title">{activity.title}</h1>
          <p className="mt-1 text-sm text-muted">{activity.instructions}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SongNote songs={lesson.songs} />
          {lesson.activities.length > 1 && (
            <Segmented
              label="Activity"
              options={lesson.activities.map((item, i) => ({ value: i, label: String(i + 1) }))}
              value={index}
              onChange={setIndex}
            />
          )}
        </div>
      </header>
      {view}
    </>
  );
}
