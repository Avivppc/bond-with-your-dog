"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { submitSupport } from "@/lib/feedback/support";

export type HelpResult = { ok: true } | { ok: false; error: string };

const Input = z.object({
  kind: z.enum(["question", "bug"]),
  body: z.string().trim().min(1, "Tell us a little more first.").max(5000, "Please keep it under 5,000 characters."),
  pageUrl: z.string().max(500).nullable(),
});

/** "Ask a question" / "Report a problem" from Help: saved to the team's Inbox as the member. */
export async function submitHelpRequest(input: z.input<typeof Input>): Promise<HelpResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/help");

  const result = await submitSupport(supabase, user.email ?? "", { ...parsed.data, subject: null });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/help");
  return { ok: true };
}
