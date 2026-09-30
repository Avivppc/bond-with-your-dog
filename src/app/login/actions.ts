"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export async function login(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const back = (error: string): never =>
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(error)}`);
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return back("Please check your email and password.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return back(error.message);
  }

  revalidatePath("/", "layout");
  redirect(next);
}
