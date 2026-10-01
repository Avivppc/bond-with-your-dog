"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { DogInput, PracticePrefsInput } from "@/lib/member/schemas";

/**
 * The team edits a member's onboarding answers and dogs from Contacts (service role; the
 * member-side rules in src/lib/member/schemas.ts apply unchanged).
 */

export type AnswersResult = { ok: true } | { ok: false; error: string };

const UserId = z.string().uuid();
const AnswersInput = PracticePrefsInput.extend({ location: z.string().trim().max(120) });
const AdminDogInput = DogInput.omit({ photoUrl: true, makeActive: true });

const fail = (error: string): AnswersResult => ({ ok: false, error });

function refresh(userId: string): void {
  revalidatePath(`/admin/people/${userId}`);
  for (const path of ["/home", "/profile", "/dogs", "/plan", "/practice"]) revalidatePath(path);
}

export async function saveMemberAnswers(userId: string, input: z.input<typeof AnswersInput>): Promise<AnswersResult> {
  await requireStaff("sales");
  const id = UserId.safeParse(userId);
  const parsed = AnswersInput.safeParse(input);
  if (!id.success) return fail("Unknown member.");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the answers.");
  const { goals, sessionMinutes, practiceDays, location } = parsed.data;
  const { error } = await createServiceClient()
    .from("profiles")
    .update({ goals, session_minutes: sessionMinutes, practice_days: [...new Set(practiceDays)].sort(), location: location || null })
    .eq("id", id.data);
  if (error) {
    console.error("[person] save answers failed", { userId, error: error.message });
    return fail("Could not save the answers. Please try again.");
  }
  refresh(id.data);
  return { ok: true };
}

/** Sends the member through the welcome questions again on their next visit. */
export async function resetMemberOnboarding(userId: string): Promise<AnswersResult> {
  await requireStaff("sales");
  const id = UserId.safeParse(userId);
  if (!id.success) return fail("Unknown member.");
  const { error } = await createServiceClient().from("profiles").update({ onboarded_at: null }).eq("id", id.data);
  if (error) {
    console.error("[person] reset onboarding failed", { userId, error: error.message });
    return fail("Could not reset the onboarding. Please try again.");
  }
  refresh(id.data);
  return { ok: true };
}

export async function saveMemberDog(userId: string, input: z.input<typeof AdminDogInput>): Promise<AnswersResult> {
  await requireStaff("sales");
  const id = UserId.safeParse(userId);
  const parsed = AdminDogInput.safeParse(input);
  if (!id.success) return fail("Unknown member.");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the dog's details.");
  const d = parsed.data;
  const row = { name: d.name, breed: d.breed, age_group: d.ageGroup, size: d.size ?? null, limitations: d.limitations, limitation_note: d.limitationNote };

  const sb = createServiceClient();
  const res = d.id
    ? await sb.from("dogs").update(row).eq("id", d.id).eq("owner_id", id.data).select("id").maybeSingle()
    : await sb.from("dogs").insert({ ...row, owner_id: id.data }).select("id").single();
  if (res.error || !res.data) {
    console.error("[person] save dog failed", { userId, dogId: d.id, error: res.error?.message });
    return fail(res.error?.message.includes("dogs_limit") ? "A member can have up to 10 dogs." : "Could not save the dog. Please try again.");
  }
  if (!d.id) {
    // A member's first dog becomes their active dog, as in the member app.
    const { error } = await sb.from("profiles").update({ active_dog_id: res.data.id }).eq("id", id.data).is("active_dog_id", null);
    if (error) console.error("[person] set active dog failed", { userId, error: error.message });
  }
  refresh(id.data);
  return { ok: true };
}

export async function deleteMemberDog(userId: string, dogId: string): Promise<AnswersResult> {
  await requireStaff("sales");
  const ids = z.object({ userId: UserId, dogId: z.string().uuid() }).safeParse({ userId, dogId });
  if (!ids.success) return fail("Unknown dog.");
  const { error } = await createServiceClient().from("dogs").delete().eq("id", ids.data.dogId).eq("owner_id", ids.data.userId);
  if (error) {
    console.error("[person] delete dog failed", { userId, dogId, error: error.message });
    return fail("Could not delete the dog. Please try again.");
  }
  refresh(ids.data.userId);
  return { ok: true };
}
