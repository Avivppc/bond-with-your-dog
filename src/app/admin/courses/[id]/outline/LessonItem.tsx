"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { OutlineLessonRow } from "@/lib/course-outline";
import { moveLesson, setLessonPublished } from "../outline-actions";
import { DragHandle, type DragHandleProps } from "./SortableList";
import { PublishToggle } from "./PublishToggle";
import { ActionMenu, MENU_ITEM } from "@/components/ui/ActionMenu";

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

const TAG = "rounded-full px-2 py-0.5 text-[11px] font-medium";

/** A lesson row inside a module card: type icon, title (opens the editor), tags, status, ⋯ menu. */
export function LessonItem({ courseId, lesson, handle, moduleOptions, onError }: LessonItemProps) {
  const [pending, startTransition] = useTransition();
  const editHref = `/admin/courses/${courseId}/lessons/${lesson.id}`;

  function setPublished(published: boolean) {
    startTransition(async () => {
      const res = await setLessonPublished({ courseId, id: lesson.id, published });
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
    <div className={`group flex min-h-12 items-center gap-2.5 py-2 pl-2 pr-4 text-sm hover:bg-[#fafaf9] ${pending ? "opacity-60" : ""}`}>
      <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DragHandle {...handle} label={lesson.title} />
      </span>
      <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
        {lesson.kind === "quiz" ? "quiz" : "videocam"}
      </span>
      <Link href={editHref} className="min-w-0 flex-1 truncate text-[#1a1a19] hover:underline">
        {lesson.title}
      </Link>
      {lesson.kind === "quiz" && <span className={`${TAG} bg-[#f1ebfb] text-[#5b2d9e]`}>Quiz</span>}
      {lesson.free_preview && <span className={`${TAG} bg-[#e6f0fb] text-[#1d4f91]`}>Free preview</span>}
      {lesson.available_after_days != null && <span className={`${TAG} bg-[#fdf1dc] text-[#8a5a00]`}>Day {lesson.available_after_days}</span>}
      <PublishToggle published={lesson.published} onChange={setPublished} disabled={pending} label={lesson.title} />
      <ActionMenu
        label={`Actions for ${lesson.title}`}
        trigger={
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            more_horiz
          </span>
        }
        triggerClassName="flex rounded-[6px] p-0.5 text-[#9b9997] hover:bg-[#efeeed] hover:text-[#1a1a19]"
      >
        {(close) => (
          <>
            <Link href={editHref} className={MENU_ITEM} onClick={close}>
              Edit lesson
            </Link>
            <Link href={`/learn/${courseId}/${lesson.id}`} target="_blank" className={MENU_ITEM} onClick={close}>
              Preview
            </Link>
            <label className="block px-3 pb-2 pt-1">
              <span className="mb-1 block text-xs text-[#6c6a69]">Move to</span>
              <select
                aria-label={`Move ${lesson.title} to another module`}
                className="w-full rounded-[8px] border border-[#d9d8d6] bg-white px-2 py-1.5 text-sm"
                value=""
                onChange={(e) => {
                  moveTo(e.target.value);
                  close();
                }}
                disabled={pending}
              >
                <option value="">Choose a module…</option>
                {moduleOptions
                  .filter((m) => m.id !== lesson.module_id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
      </ActionMenu>
    </div>
  );
}
