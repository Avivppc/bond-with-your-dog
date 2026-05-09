"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

export async function approveVideo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const sb = createServiceClient();
  await sb.from("student_videos").update({ approved: true, is_public: true }).eq("id", id);
  revalidatePath("/admin/videos");
  revalidatePath("/community");
}

export async function unapproveVideo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const sb = createServiceClient();
  await sb.from("student_videos").update({ approved: false, is_public: false }).eq("id", id);
  revalidatePath("/admin/videos");
  revalidatePath("/community");
}

export async function deleteVideo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const sb = createServiceClient();
  await sb.from("student_videos").delete().eq("id", id);
  revalidatePath("/admin/videos");
  revalidatePath("/community");
}
