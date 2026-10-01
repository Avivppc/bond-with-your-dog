"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidateCourseContent } from "@/app/admin/courses/revalidate";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

const CourseSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2, "The URL slug needs at least 2 characters.")
    .max(80, "The URL slug can be up to 80 characters.")
    .regex(/^[a-z0-9-]+$/, "URL slug: use lowercase letters, numbers and dashes only."),
  title: z.string().trim().min(2, "The title needs at least 2 characters.").max(200, "The title can be up to 200 characters."),
  description: z.string().trim().min(10, "Write a description of at least 10 characters.").max(5000, "The description can be up to 5,000 characters."),
  level: z.enum(["Beginner", "Intermediate", "Advanced"], { message: "Choose a level." }),
  category: z.string().trim().min(2, "The category needs at least 2 characters.").max(80, "The category can be up to 80 characters."),
  price: z.coerce.number({ message: "List price must be a number." }).min(0, "List price can't be negative.").max(100_000, "List price is too high."),
  badge: z
    .string()
    .trim()
    .max(30, "The badge can be up to 30 characters.")
    .optional()
    .transform((v) => v || null),
  published: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

function detailsUrl(id: string, params: Record<string, string>, tab = "details"): string {
  return `/admin/courses/${encodeURIComponent(id)}?${new URLSearchParams({ tab, ...params }).toString()}`;
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/courses/new?error=" + encodeURIComponent(parsed.error.issues[0].message));
  }
  const { error } = await createServiceClient().from("courses").insert(parsed.data);
  if (error) {
    console.error("[admin] course create failed", { id: parsed.data.id, error: error.message });
    const message = error.code === UNIQUE_VIOLATION ? "A course with this URL slug already exists. Choose another slug." : "Could not create the course. Please try again.";
    redirect("/admin/courses/new?error=" + encodeURIComponent(message));
  }
  revalidateCourseContent(parsed.data.id);
  redirect(`/admin/courses/${encodeURIComponent(parsed.data.id)}?saved=created`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const rawId = String(formData.get("id") ?? "");
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(detailsUrl(rawId, { error: parsed.error.issues[0].message }));

  const { id, ...rest } = parsed.data;
  const { data, error } = await createServiceClient().from("courses").update(rest).eq("id", id).select("id");
  if (error) {
    console.error("[admin] course update failed", { id, error: error.message });
    redirect(detailsUrl(id, { error: "Could not save the course details. Please try again." }));
  }
  if (!data?.length) redirect("/admin/courses");
  revalidateCourseContent(id);
  redirect(detailsUrl(id, { saved: "1" }));
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/admin/courses");
  const { error } = await createServiceClient().from("courses").delete().eq("id", id);
  if (error) {
    console.error("[admin] course delete failed", { id, error: error.message });
    const message =
      error.code === FOREIGN_KEY_VIOLATION
        ? "This course has orders or other records attached, so it can't be deleted. Set it to draft instead."
        : "This course couldn't be deleted. Please try again.";
    redirect(detailsUrl(id, { error: message }, "settings"));
  }
  revalidateCourseContent(id);
  revalidatePath("/admin/products");
  redirect("/admin/courses");
}
