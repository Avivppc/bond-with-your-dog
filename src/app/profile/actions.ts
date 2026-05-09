"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  full_name: z.string().max(120).optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  dog_name: z.string().max(60).optional(),
  dog_breed: z.string().max(80).optional(),
  dog_age: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(40).nullable().optional()),
  location: z.string().max(120).optional(),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/profile?error=" + encodeURIComponent(parsed.error.issues[0].message));
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    redirect("/profile?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?saved=1");
}
