import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";
import { notifyTeam } from "@/lib/notify-team";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type SupportKind = "question" | "bug";

export interface SupportInput {
  kind: SupportKind;
  subject: string | null;
  body: string;
  pageUrl: string | null;
}

const ERRORS: Record<string, { status: number; error: string }> = {
  "54000": { status: 429, error: "You've sent a lot of requests today. Please try again tomorrow." },
  "28000": { status: 401, error: "Please sign in again." },
  "23514": { status: 400, error: "Please write a little more (up to 5,000 characters)." },
};

/** Only in-app paths are kept as "the page it happened on". */
export function safePagePath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value.slice(0, 500);
}

/**
 * Saves a question or problem report to the support inbox (admin Inbox) as the member, then
 * lets the team know by email when email is configured. The save is what counts.
 */
export async function submitSupport(
  supabase: ServerSupabase,
  fromEmail: string,
  input: SupportInput
): Promise<{ ok: true; id: string; emailed: boolean } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase.rpc("submit_support_request", {
    p_kind: input.kind,
    p_subject: input.subject,
    p_body: input.body,
    p_page_url: safePagePath(input.pageUrl),
    p_consent_public: false,
  });
  if (error || typeof data !== "string") {
    console.error("[support] submit failed", { kind: input.kind, error: error?.message });
    return { ok: false, ...(ERRORS[error?.code ?? ""] ?? { status: 500, error: "That didn't send. Please try again." }) };
  }

  const emailed = await notifyTeam("inbox", {
    subject: `[${input.kind === "bug" ? "Problem report" : "Question"}] ${input.subject ?? input.body.slice(0, 60)}`,
    lines: [`From: ${fromEmail}`, input.pageUrl ? `Page: ${siteUrl()}${safePagePath(input.pageUrl) ?? ""}` : null, "", input.body],
    path: "/admin/inbox",
  });
  return { ok: true, id: data, emailed };
}
