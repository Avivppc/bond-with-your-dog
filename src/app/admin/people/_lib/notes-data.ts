import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

const NOTES_SHOWN = 50;

export interface ContactNote {
  id: string;
  body: string;
  createdAt: string;
  /** Email of the staff member who wrote it (null when that account is gone). */
  author: string | null;
}

export interface ContactNotes {
  notes: ContactNote[];
  failed: boolean;
}

/** The latest private staff notes on a contact, newest first. */
export async function loadContactNotes(contactId: string): Promise<ContactNotes> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("contact_notes")
    .select("id, body, created_at, author_id")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(NOTES_SHOWN);
  if (error) {
    console.error("[person] notes failed", { contactId, error: error.message });
    return { notes: [], failed: true };
  }
  const authorIds = [...new Set((data ?? []).flatMap((n) => (n.author_id ? [n.author_id as string] : [])))];
  const emails = authorIds.length ? await sb.rpc("admin_user_emails", { p_user_ids: authorIds }) : null;
  if (emails?.error) console.error("[person] note authors failed", { contactId, error: emails.error.message });
  const emailOf = new Map(((emails?.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));
  return {
    failed: false,
    notes: (data ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      createdAt: n.created_at as string,
      author: n.author_id ? (emailOf.get(n.author_id as string) ?? null) : null,
    })),
  };
}
