"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function markRead(ids: string[] | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids });
  if (error) {
    console.error("[notifications] mark read failed", error.message);
    return { ok: false, error: "That didn't save. Please try again." };
  }
  revalidatePath("/", "layout"); // the bell's unread count lives in the shell
  return { ok: true };
}

/** Marks one notification read (the member is about to open it). */
export async function markNotificationRead(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Unknown notification." };
  return markRead([id]);
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return markRead(null);
}
