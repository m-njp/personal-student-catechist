import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonCard } from "@/components/ui/LessonCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Screen } from "@/components/ui/Screen";
import { getLesson, lessons } from "@/content/lessons";
import { ReflectionForm } from "@/features/reflections/ReflectionForm";

interface ReflectPageProps {
  params: Promise<{ lessonId: string }>;
}

export const metadata: Metadata = { title: "Write a reflection" };

export function generateStaticParams() {
  return lessons.filter((lesson) => lesson.canWriteReflection).map((lesson) => ({ lessonId: lesson.id }));
}

export default async function ReflectPage({ params }: ReflectPageProps) {
  const lesson = getLesson((await params).lessonId);
  if (!lesson || !lesson.canWriteReflection) notFound();

  return (
    <Screen lessonId={lesson.id}>
      <div className="w-full max-w-page px-4 py-8 lg:px-10 lg:py-12">
        <PageHeading
          eyebrow={`Lesson ${lesson.label}`}
          title="Write a reflection"
          intro="Think about today. Then write in your own words."
        />
        {/* Card first in the markup so it sits on top on phones; it moves to the right on wide screens. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
          <aside className="lg:sticky lg:top-8 lg:order-last lg:w-aside lg:shrink-0">
            <LessonCard label={lesson.label} theme={lesson.theme} cover={lesson.cover}>
              <p className="text-sm text-muted">Write two or three sentences. There are no wrong answers.</p>
            </LessonCard>
          </aside>
          <div className="min-w-0 flex-1">
            <ReflectionForm lessonId={lesson.id} prompt={lesson.reflectionPrompt} starters={lesson.reflectionStarters} />
          </div>
        </div>
      </div>
    </Screen>
  );
}
