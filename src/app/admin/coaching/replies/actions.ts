"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { savedReplySchema, type SavedReply, type SavedReplyInput } from "@/lib/saved-replies/replies";

/** Coaching → Saved replies: the shared list behind every reply box's "Saved replies" picker. */
export type ReplyResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const Id = z.string().uuid();
const MAX_REPLIES = 500;

function done(): void {
  revalidatePath("/admin/coaching/replies");
}

export async function listSavedReplies(): Promise<ReplyResult<SavedReply[]>> {
  await requireStaff("content");
  const { data, error } = await createServiceClient().from("saved_replies").select("id, title, body").order("title").limit(MAX_REPLIES);
  if (error) {
    console.error("[saved-replies] list failed", error.message);
    return { ok: false, error: "Could not load saved replies." };
  }
  return { ok: true, data: data ?? [] };
}

export async function createSavedReply(input: SavedReplyInput): Promise<ReplyResult<SavedReply>> {
  const { user } = await requireStaff("content");
  const parsed = savedReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data, error } = await createServiceClient()
    .from("saved_replies")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id, title, body")
    .single();
  if (error || !data) {
    console.error("[saved-replies] create failed", error?.message);
    return { ok: false, error: "Could not save the reply." };
  }
  done();
  return { ok: true, data };
}

export async function updateSavedReply(id: string, input: SavedReplyInput): Promise<ReplyResult<SavedReply>> {
  await requireStaff("content");
  const parsedId = Id.safeParse(id);
  const parsed = savedReplySchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "This reply no longer exists." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data, error } = await createServiceClient()
    .from("saved_replies")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .select("id, title, body")
    .maybeSingle();
  if (error) {
    console.error("[saved-replies] update failed", { id, error: error.message });
    return { ok: false, error: "Could not save the reply." };
  }
  if (!data) return { ok: false, error: "This reply no longer exists." };
  done();
  return { ok: true, data };
}

export async function deleteSavedReply(id: string): Promise<ReplyResult> {
  await requireStaff("content");
  const parsedId = Id.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "This reply no longer exists." };

  const { error } = await createServiceClient().from("saved_replies").delete().eq("id", parsedId.data);
  if (error) {
    console.error("[saved-replies] delete failed", { id, error: error.message });
    return { ok: false, error: "Could not delete the reply." };
  }
  done();
  return { ok: true, data: undefined };
}
