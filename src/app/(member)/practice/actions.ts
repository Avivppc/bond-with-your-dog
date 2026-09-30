"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, isIsoDate } from "@/lib/practice/dates";
import { MAX_SESSION_SECONDS } from "@/lib/practice/session";
import { memberClient } from "@/lib/practice/server/auth";
import { dbMessage, fail, ok, type ActionResult } from "@/lib/practice/result";

const SaveSession = z.object({
  lessonId: z.string().uuid(),
  moveId: z.string().uuid().nullable(),
  dogId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(MAX_SESSION_SECONDS),
  reps: z.number().int().min(0).max(1000),
  stepsDone: z.number().int().min(0).max(50),
  /** The member's local calendar date. */
  practicedOn: z.string().refine(isIsoDate, "Invalid date."),
});

/** A local date can be a day ahead of or behind the server's UTC date, never more. */
function plausibleLocalDate(iso: string): boolean {
  const utcToday = new Date().toISOString().slice(0, 10);
  return iso >= addDays(utcToday, -1) && iso <= addDays(utcToday, 1);
}

/** Saves a finished (or stopped) practice session for the member's dog. */
export async function savePracticeSession(input: z.input<typeof SaveSession>): Promise<ActionResult<{ id: string }>> {
  const parsed = SaveSession.safeParse(input);
  if (!parsed.success) return fail("That session couldn't be saved. Please try again.");
  const s = parsed.data;
  if (!plausibleLocalDate(s.practicedOn)) return fail("Your device's date looks off. Check it and try again.");
  if (s.durationSeconds < 5 && s.reps === 0 && s.stepsDone === 0) return fail("Start the session before saving it.");

  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { supabase, userId } = member;

  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_lesson", { p_lesson_id: s.lessonId });
  if (accessError) {
    console.error("[practice] access check failed", accessError.message);
    return fail(dbMessage(accessError.code));
  }
  if (!canAccess) return fail("This lesson isn't open for you, so the session can't be saved.");

  // RLS checks that the dog is the member's own.
  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      dog_id: s.dogId,
      lesson_id: s.lessonId,
      move_id: s.moveId,
      practiced_on: s.practicedOn,
      duration_seconds: s.durationSeconds,
      reps: s.reps,
      steps_done: s.stepsDone,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[practice] save session failed", error?.message);
    return fail(dbMessage(error?.code));
  }
  for (const path of ["/plan", "/progress", "/home"]) revalidatePath(path);
  return ok({ id: data.id as string });
}
