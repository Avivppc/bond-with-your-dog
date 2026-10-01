"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isOwnPhotoUrl } from "@/lib/member/photos";
import { fail, ok, type ActionResult } from "@/lib/member/result";
import { AboutYouInput, DogInput, PracticePrefsInput } from "@/lib/member/schemas";
import { createVerifyLink, isEmailVerified } from "@/lib/auth/email-verification";
import { nextResend } from "@/lib/auth/resend-throttle";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { confirmEmail } from "@/lib/welcome-email";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function photoAllowed(url: string | null, userId: string): boolean {
  return url === null || isOwnPhotoUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", userId);
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Create or update one of the member's dogs (RLS keeps it to their own). */
export async function saveDog(input: DogInput): Promise<ActionResult<{ id: string }>> {
  const parsed = DogInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the details.");
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  const d = parsed.data;
  if (!photoAllowed(d.photoUrl, user.id)) return fail("Please upload the photo again.");

  const row = {
    name: d.name,
    breed: d.breed,
    age_group: d.ageGroup,
    size: d.size ?? null,
    limitations: d.limitations,
    limitation_note: d.limitationNote,
    photo_url: d.photoUrl,
  };
  const res = d.id
    ? await supabase.from("dogs").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("dogs").insert({ ...row, owner_id: user.id }).select("id").single();
  if (res.error || !res.data) {
    console.error("[dogs] save failed", { userId: user.id, error: res.error?.message });
    return fail(res.error?.code === "23514" ? "You can add up to 10 dogs." : "Could not save your dog. Please try again.");
  }

  const { data: profile } = await supabase.from("profiles").select("active_dog_id").eq("id", user.id).maybeSingle();
  if (d.makeActive || !profile?.active_dog_id) {
    await supabase.from("profiles").update({ active_dog_id: res.data.id }).eq("id", user.id);
  }
  refresh();
  return ok({ id: res.data.id });
}

export async function deleteDog(dogId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(dogId).success) return fail("Invalid dog.");
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  const { error } = await supabase.from("dogs").delete().eq("id", dogId);
  if (error) {
    console.error("[dogs] delete failed", { userId: user.id, error: error.message });
    return fail("Could not remove the dog.");
  }
  // Keep an active dog if one is left.
  const { data: rest } = await supabase.from("dogs").select("id").order("created_at").limit(1);
  const { data: profile } = await supabase.from("profiles").select("active_dog_id").eq("id", user.id).maybeSingle();
  if (!profile?.active_dog_id && rest?.[0]) await supabase.from("profiles").update({ active_dog_id: rest[0].id }).eq("id", user.id);
  refresh();
  return ok(undefined);
}

export async function saveAboutYou(input: AboutYouInput): Promise<ActionResult> {
  const parsed = AboutYouInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the details.");
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  if (!photoAllowed(parsed.data.avatarUrl, user.id)) return fail("Please upload the photo again.");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, location: parsed.data.location, avatar_url: parsed.data.avatarUrl })
    .eq("id", user.id);
  if (error) {
    console.error("[profile] save failed", { userId: user.id, error: error.message });
    return fail("Could not save. Please try again.");
  }
  refresh();
  return ok(undefined);
}

export async function savePracticePrefs(input: PracticePrefsInput): Promise<ActionResult> {
  const parsed = PracticePrefsInput.safeParse(input);
  if (!parsed.success) return fail("Please check your choices.");
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  const days = [...new Set(parsed.data.practiceDays)].sort();
  const { error } = await supabase
    .from("profiles")
    .update({ goals: [...new Set(parsed.data.goals)], session_minutes: parsed.data.sessionMinutes, practice_days: days })
    .eq("id", user.id);
  if (error) {
    console.error("[profile] prefs save failed", { userId: user.id, error: error.message });
    return fail("Could not save. Please try again.");
  }
  refresh();
  return ok(undefined);
}

/** The chapter the member wants to follow (onboarding "Your course"). Access still comes from enrollments. */
export async function saveChosenCourse(courseId: string): Promise<ActionResult> {
  if (!z.string().min(1).max(100).safeParse(courseId).success) return fail("Please choose a course.");
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  // RLS only shows published courses, so this also rejects drafts.
  const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (!course) return fail("That course isn't available. Please pick another.");
  const { error } = await supabase.from("profiles").update({ chosen_course_id: courseId }).eq("id", user.id);
  if (error) {
    console.error("[onboarding] course choice failed", { userId: user.id, error: error.message });
    return fail("Could not save. Please try again.");
  }
  refresh();
  return ok(undefined);
}

/** Emails a fresh confirm-your-email link (Home reminder), at most every few minutes. */
export async function resendVerifyEmail(): Promise<ActionResult> {
  const { supabase, user } = await signedIn();
  if (!user?.email) return fail("Please sign in again.");
  if (await isEmailVerified(supabase)) return ok(undefined);

  // Send times live in app_metadata, which only the server can write.
  const decision = nextResend(user.app_metadata?.verify_link_sends ?? [], Date.now());
  if (!decision.allowed) {
    const minutes = Math.ceil(decision.retryInSeconds / 60);
    return fail(`We just sent you a link. You can ask for another in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
  const { error: recordError } = await createServiceClient().auth.admin.updateUserById(user.id, {
    app_metadata: { verify_link_sends: decision.history },
  });
  if (recordError) {
    console.error("[verify-email] could not record resend", { userId: user.id, error: recordError.message });
    return fail("We couldn't send the email right now. Please try again in a few minutes.");
  }

  const origin = (await headers()).get("origin") ?? siteUrl();
  const link = await createVerifyLink(user.email, origin);
  if (!link || !(await sendEmail(confirmEmail(user.email, link)))) {
    return fail("We couldn't send the email right now. Please try again in a few minutes.");
  }
  return ok(undefined);
}

/** Onboarding done (also used by "Save and finish later" so the member isn't asked again). */
export async function finishOnboarding(): Promise<ActionResult> {
  const { supabase, user } = await signedIn();
  if (!user) return fail("Please sign in again.");
  const { error } = await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id).is("onboarded_at", null);
  if (error) {
    console.error("[onboarding] finish failed", { userId: user.id, error: error.message });
    return fail("Could not save. Please try again.");
  }
  refresh();
  return ok(undefined);
}

/** Remember that a guided tour was seen (or skipped). */
export async function markTourSeen(tour: string): Promise<void> {
  if (!/^[a-z-]{2,30}$/.test(tour)) return;
  const { supabase, user } = await signedIn();
  if (!user) return;
  const { data } = await supabase.from("profiles").select("tours_seen").eq("id", user.id).maybeSingle();
  const seen = new Set<string>(data?.tours_seen ?? []);
  if (seen.has(tour)) return;
  seen.add(tour);
  const { error } = await supabase.from("profiles").update({ tours_seen: [...seen] }).eq("id", user.id);
  if (error) console.error("[tour] save failed", { userId: user.id, error: error.message });
}
