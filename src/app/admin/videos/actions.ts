"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const Id = z.string().uuid();

function back(params: Record<string, string>): never {
  redirect(`/admin/videos?${new URLSearchParams(params).toString()}`);
}

async function update(formData: FormData, values: { approved: boolean; is_public: boolean } | "delete", ok: string): Promise<void> {
  await requireStaff("content");
  const id = Id.safeParse(formData.get("id"));
  if (!id.success) back({ error: "Invalid video." });
  const table = createServiceClient().from("student_videos");
  const { error } = values === "delete" ? await table.delete().eq("id", id.data) : await table.update(values).eq("id", id.data);
  if (error) {
    console.error("[videos] moderation failed", { id: id.data, action: values === "delete" ? "delete" : values, error: error.message });
    back({ error: "Could not update the video." });
  }
  revalidatePath("/admin/videos");
  revalidatePath("/spotlight");
  back({ ok });
}

export async function approveVideo(formData: FormData): Promise<void> {
  await update(formData, { approved: true, is_public: true }, "Featured on /spotlight.");
}

export async function unapproveVideo(formData: FormData): Promise<void> {
  await update(formData, { approved: false, is_public: false }, "Removed from /spotlight.");
}

export async function deleteVideo(formData: FormData): Promise<void> {
  await update(formData, "delete", "Video deleted.");
}
