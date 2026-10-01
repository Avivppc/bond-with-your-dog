"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { trackLessonCompleted } from "@/lib/member/lesson-analytics";

/**
 * Called by the lesson screen after complete_lesson succeeds in the browser.
 * Reads the completion back from the database, so only a real completion is counted.
 */
export async function reportLessonCompleted(lessonId: string): Promise<void> {
  if (!z.string().uuid().safeParse(lessonId).success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await trackLessonCompleted(supabase, user, lessonId);
}
