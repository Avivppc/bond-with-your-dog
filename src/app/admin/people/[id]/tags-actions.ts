"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeTag } from "@/lib/flows/actions";
import { exactLike } from "@/lib/flows/like";

const Input = z.object({ contact_id: z.string().uuid(), tag: z.string().max(60) });

function back(contactId: string, params: Record<string, string>): never {
  redirect(`/admin/people/${contactId}?${new URLSearchParams(params).toString()}#tags`);
}

async function parse(formData: FormData): Promise<{ contactId: string; tag: string; email: string }> {
  await requireStaff("sales");
  const parsed = Input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/people?error=Invalid+request.");
  const tag = normalizeTag(parsed.data.tag);
  if (!tag) back(parsed.data.contact_id, { error: "Tags use letters, numbers, spaces and dashes (up to 40)." });
  const { data } = await createServiceClient().auth.admin.getUserById(parsed.data.contact_id);
  const email = data.user?.email;
  if (!email) back(parsed.data.contact_id, { error: "This contact has no email address." });
  return { contactId: parsed.data.contact_id, tag, email };
}

export async function addContactTag(formData: FormData): Promise<void> {
  const { contactId, tag, email } = await parse(formData);
  const { error } = await createServiceClient().from("contact_tags").insert({ email, user_id: contactId, tag, source: "admin" });
  if (error && error.code !== "23505") {
    console.error("[person] add tag failed", { contactId, error: error.message });
    back(contactId, { error: "Could not add the tag. Please try again." });
  }
  revalidatePath(`/admin/people/${contactId}`);
  back(contactId, { ok: `Tagged "${tag}".` });
}

export async function removeContactTag(formData: FormData): Promise<void> {
  const { contactId, tag, email } = await parse(formData);
  const { error } = await createServiceClient().from("contact_tags").delete().eq("tag", tag).ilike("email", exactLike(email));
  if (error) {
    console.error("[person] remove tag failed", { contactId, error: error.message });
    back(contactId, { error: "Could not remove the tag. Please try again." });
  }
  revalidatePath(`/admin/people/${contactId}`);
  back(contactId, { ok: `Removed "${tag}".` });
}
