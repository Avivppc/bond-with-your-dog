"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { memberClient } from "@/lib/practice/server/auth";
import { dbMessage, fail, ok, type ActionResult } from "@/lib/practice/result";
import { EVENTS, trackMember } from "@/lib/analytics-server";

const SetLevel = z.object({
  dogId: z.string().uuid(),
  moveId: z.string().uuid(),
  /** null = back to "not started". Members can't set performance-ready (the RPC refuses too). */
  level: z.enum(["learning", "reliable"]).nullable(),
});

export async function setMoveLevel(input: z.input<typeof SetLevel>): Promise<ActionResult> {
  const parsed = SetLevel.safeParse(input);
  if (!parsed.success) return fail("Choose Learning or Reliable.");
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { error } = await member.supabase.rpc("set_dog_skill", {
    p_dog_id: parsed.data.dogId,
    p_move_id: parsed.data.moveId,
    p_level: parsed.data.level,
  });
  if (error) {
    console.error("[moves] set level failed", error.message);
    return fail(dbMessage(error.code));
  }
  trackMember({ id: member.userId, email: member.email }, EVENTS.skillLevelChanged, {
    dog_id: parsed.data.dogId,
    move_id: parsed.data.moveId,
    to_level: parsed.data.level ?? "not_started",
    set_by: "member",
  });
  for (const path of ["/moves", "/progress", "/home"]) revalidatePath(path);
  return ok(undefined);
}
