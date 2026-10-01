"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EVENTS, trackMember } from "@/lib/analytics-server";
import { TimeZoneInput } from "@/lib/reminders/timezone-input";

/**
 * Saves the browser's time zone the first time we see it (reminders use it). Never overwrites a zone
 * the member already has; they change it in Settings.
 */
export async function rememberTimeZone(timeZone: string): Promise<void> {
  const parsed = TimeZoneInput.safeParse(timeZone);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id).is("timezone", null);
  if (error) console.error("[member] save time zone failed", { userId: user.id, error: error.message });
}

/** Switch the dog the whole app shows (progress, plan, feedback). The DB checks ownership. */
export async function setActiveDog(dogId: string): Promise<void> {
  if (!z.string().uuid().safeParse(dogId).success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("profiles").update({ active_dog_id: dogId }).eq("id", user.id);
  if (error) console.error("[member] switch dog failed", error.message);
  else trackMember(user, EVENTS.activeDogSwitched, { dog_id: dogId });
  revalidatePath("/", "layout");
}
