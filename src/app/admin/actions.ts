"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const CourseSchema = z.object({
  id: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes only"),
  title: z.string().min(2),
  description: z.string().min(10),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  category: z.string().min(2),
  price: z.coerce.number().min(0),
  badge: z.string().optional(),
  image: z.string().optional(),
  image_alt: z.string().optional(),
  published: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/courses/new?error=" + encodeURIComponent(parsed.error.issues[0].message));
  }
  const sb = createServiceClient();
  const { error } = await sb.from("courses").insert(parsed.data);
  if (error) {
    redirect("/admin/courses/new?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${parsed.data.id}`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/courses/${formData.get("id")}?tab=details&error=` + encodeURIComponent(parsed.error.issues[0].message));
  }
  const sb = createServiceClient();
  const { id, ...rest } = parsed.data;
  const { error } = await sb.from("courses").update(rest).eq("id", id);
  if (error) {
    redirect(`/admin/courses/${id}?tab=details&error=` + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath(`/learn/${id}`);
  redirect(`/admin/courses/${id}?tab=details&saved=1`);
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const sb = createServiceClient();
  const { error } = await sb.from("courses").delete().eq("id", id);
  if (error) {
    console.error("[admin] course delete failed", { id, error: error.message });
    redirect(`/admin/courses/${id}?tab=details&error=` + encodeURIComponent("This course couldn't be deleted. If members are enrolled, unpublish it instead."));
  }
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
