"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { OutlineLessonRow } from "@/lib/course-outline";
import { moveLesson, setLessonPublished } from "../outline-actions";
import { DragHandle, type DragHandleProps } from "./SortableList";
import { PublishToggle } from "./PublishToggle";

export interface ModuleOption {
  id: string;
  label: string;
}

interface LessonItemProps {
  courseId: string;
  lesson: OutlineLessonRow;
  handle: DragHandleProps;
  moduleOptions: readonly ModuleOption[];
  onError: (message: string) => void;
}

export function LessonItem({ courseId, lesson, handle, moduleOptions, onError }: LessonItemProps) {
  const [pending, startTransition] = useTransition();

  function togglePublished() {
    startTransition(async () => {
      const res = await setLessonPublished({ courseId, id: lesson.id, published: !lesson.published });
      if (!res.ok) onError(res.error);
    });
  }

  function moveTo(moduleId: string) {
    if (!moduleId || moduleId === lesson.module_id) return;
    startTransition(async () => {
      const res = await moveLesson({ courseId, id: lesson.id, moduleId });
      if (!res.ok) onError(res.error);
    });
  }

  return (
    <div
      className={`flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 text-sm ${pending ? "opacity-60" : ""}`}
    >
      <DragHandle {...handle} label={lesson.title} />
      <Link
        href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
        className="font-semibold text-slate-800 truncate hover:text-orange-700 flex-1 min-w-0"
      >
        {lesson.title}
      </Link>
      {lesson.kind === "quiz" && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
          quiz
        </span>
      )}
      {lesson.free_preview && (
        <span className="text-[10px] font-bold uppercase text-emerald-700">free preview</span>
      )}
      {lesson.available_after_days != null && (
        <span className="text-[10px] font-bold uppercase text-slate-500">
          drips {lesson.available_after_days}d
        </span>
      )}
      <select
        aria-label={`Move ${lesson.title} to another module`}
        className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 max-w-36"
        value=""
        onChange={(e) => moveTo(e.target.value)}
        disabled={pending}
      >
        <option value="">Move to…</option>
        {moduleOptions
          .filter((m) => m.id !== lesson.module_id)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
      </select>
      <PublishToggle published={lesson.published} onToggle={togglePublished} disabled={pending} />
    </div>
  );
}
