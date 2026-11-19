import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonCard } from "@/components/ui/LessonCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Screen } from "@/components/ui/Screen";
import { getLesson, lessons } from "@/content/lessons";
import { ReflectionCards } from "@/features/reflections/ReflectionCards";

interface ReflectionsPageProps {
  params: Promise<{ lessonId: string }>;
}

export const metadata: Metadata = { title: "Reflections" };

export function generateStaticParams() {
  return lessons.map((lesson) => ({ lessonId: lesson.id }));
}

export default async function ReflectionsPage({ params }: ReflectionsPageProps) {
  const lesson = getLesson((await params).lessonId);
  if (!lesson) notFound();

  return (
    <Screen lessonId={lesson.id}>
      <div className="w-full max-w-page px-4 py-8 lg:px-10 lg:py-12">
        <PageHeading eyebrow={`Lesson ${lesson.label}`} title="Reflections" intro={lesson.reflectionPrompt} />
        <ReflectionCards
          lessonId={lesson.id}
          canWrite={lesson.canWriteReflection}
          aside={<LessonCard label={lesson.label} theme={lesson.theme} cover={lesson.cover} />}
        />
      </div>
    </Screen>
  );
}
