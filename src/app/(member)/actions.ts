"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EVENTS, trackMember } from "@/lib/analytics-server";

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
