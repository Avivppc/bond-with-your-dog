"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, isIsoDate } from "@/lib/practice/dates";
import { memberClient } from "@/lib/practice/server/auth";
import { dbMessage, fail, ok, type ActionResult } from "@/lib/practice/result";

/** How far ahead a session can be planned. */
const PLAN_AHEAD_DAYS = 60;

const AddPlanned = z.object({
  plannedOn: z.string().refine(isIsoDate, "Choose a day."),
  minutes: z.number().int().min(1, "Choose how long.").max(60, "Keep sessions under an hour."),
  lessonId: z.string().uuid().nullable(),
  dogId: z.string().uuid(),
});

function refresh(): void {
  for (const path of ["/plan", "/home"]) revalidatePath(path);
}

export async function addPlannedSession(input: z.input<typeof AddPlanned>): Promise<ActionResult> {
  const parsed = AddPlanned.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const p = parsed.data;
  const utcToday = new Date().toISOString().slice(0, 10);
  if (p.plannedOn < addDays(utcToday, -1) || p.plannedOn > addDays(utcToday, PLAN_AHEAD_DAYS)) {
    return fail("Pick a day from today onwards.");
  }

  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { supabase, userId } = member;

  if (p.lessonId) {
    const { data: canAccess } = await supabase.rpc("can_access_lesson", { p_lesson_id: p.lessonId });
    if (!canAccess) return fail("That lesson isn't open for you yet.");
  }
  // RLS: own row, own dog.
  const { error } = await supabase
    .from("practice_plan")
    .insert({ user_id: userId, dog_id: p.dogId, planned_on: p.plannedOn, minutes: p.minutes, lesson_id: p.lessonId });
  if (error) {
    console.error("[plan] add failed", error.message);
    return fail(dbMessage(error.code));
  }
  refresh();
  return ok(undefined);
}

export async function removePlannedSession(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return fail("That session wasn't found.");
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { error, count } = await member.supabase.from("practice_plan").delete({ count: "exact" }).eq("id", id);
  if (error) {
    console.error("[plan] remove failed", error.message);
    return fail(dbMessage(error.code));
  }
  if (!count) return fail("That session wasn't found.");
  refresh();
  return ok(undefined);
}

const Prefs = z.object({
  practiceDays: z.array(z.number().int().min(0).max(6)).max(7),
  sessionMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});

/** The member's default rhythm: which weekdays and how long (profiles). */
export async function updatePracticePrefs(input: z.input<typeof Prefs>): Promise<ActionResult> {
  const parsed = Prefs.safeParse(input);
  if (!parsed.success) return fail("Choose your days and a session length.");
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const days = [...new Set(parsed.data.practiceDays)].sort();
  const { error } = await member.supabase
    .from("profiles")
    .update({ practice_days: days, session_minutes: parsed.data.sessionMinutes })
    .eq("id", member.userId);
  if (error) {
    console.error("[plan] prefs update failed", error.message);
    return fail(dbMessage(error.code));
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}
