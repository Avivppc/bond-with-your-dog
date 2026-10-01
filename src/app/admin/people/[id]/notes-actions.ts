"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const MAX_NOTE_LENGTH = 5000;

const ContactId = z.string().uuid();
const NewNote = z.object({
  contact_id: ContactId,
  body: z.string().trim().min(1, "Write the note first.").max(MAX_NOTE_LENGTH, "Keep the note under 5,000 characters."),
});
const NoteRef = z.object({ contact_id: ContactId, id: z.string().uuid() });

function back(contactId: string, params: Record<string, string>): never {
  redirect(`/admin/people/${contactId}?${new URLSearchParams(params).toString()}#notes`);
}

function contactIdOf(formData: FormData): string {
  const id = ContactId.safeParse(formData.get("contact_id"));
  if (!id.success) redirect("/admin/people?error=Invalid+request.");
  return id.data;
}

/** Adds a private staff note to a contact. */
export async function addContactNote(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const contactId = contactIdOf(formData);
  const parsed = NewNote.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(contactId, { error: parsed.error.issues[0].message });
  const { error } = await createServiceClient()
    .from("contact_notes")
    .insert({ contact_id: contactId, author_id: user.id, body: parsed.data.body });
  if (error) {
    console.error("[person] add note failed", { contactId, error: error.message });
    back(contactId, { error: "Could not save the note. Please try again." });
  }
  revalidatePath(`/admin/people/${contactId}`);
  back(contactId, { ok: "Note added." });
}

/** Deletes one note from a contact. */
export async function deleteContactNote(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const contactId = contactIdOf(formData);
  const parsed = NoteRef.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(contactId, { error: "Invalid request." });
  const { data, error } = await createServiceClient()
    .from("contact_notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("contact_id", contactId)
    .select("id");
  if (error || !data?.length) {
    console.error("[person] delete note failed", { contactId, id: parsed.data.id, error: error?.message ?? "not found" });
    back(contactId, { error: error ? "Could not delete the note. Please try again." : "That note was already deleted." });
  }
  revalidatePath(`/admin/people/${contactId}`);
  back(contactId, { ok: "Note deleted." });
}
