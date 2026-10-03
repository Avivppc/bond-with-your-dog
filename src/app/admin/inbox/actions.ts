"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { pushSoon } from "@/lib/push/server";
import { sendEmail, siteUrl } from "@/lib/email";
import { parsePage } from "@/lib/admin-helpers/pagination";
import { inboxHref, parseInboxStatus, parseInboxTab } from "@/lib/admin-helpers/inbox";
import { isFilledIn, UNFILLED_TAGS_ERROR } from "@/lib/saved-replies/replies";

const Id = z.string().uuid();
const Answer = z.string().trim().min(1, "Write an answer first.").max(5000, "Keep the answer under 5,000 characters.").refine(isFilledIn, UNFILLED_TAGS_ERROR);
const ApprovalNote = z.string().trim().max(5000).optional();

function back(formData: FormData, params: Record<string, string>): never {
  const view = {
    tab: parseInboxTab(formData.get("tab")),
    status: parseInboxStatus(formData.get("status_view")),
    page: parsePage(String(formData.get("page") ?? "")),
  };
  redirect(inboxHref(view, params));
}

/** The inbox, the top bar's open count (every admin page) and the member's Help page. */
function done(): void {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin", "layout");
  revalidatePath("/help");
}

async function memberEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
  if (error) console.error("[inbox] member lookup failed", { userId, error: error.message });
  return data.user?.email ?? null;
}

/** Saves an answer (the DB trigger notifies the member in the app) and emails it when email is set up. */
export async function answerRequest(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const id = Id.safeParse(formData.get("id"));
  const answer = Answer.safeParse(formData.get("answer"));
  if (!id.success) back(formData, { error: "Invalid request." });
  if (!answer.success) back(formData, { error: answer.error.issues[0].message });

  const { data: request, error } = await createServiceClient()
    .from("support_requests")
    .update({ answer: answer.data, status: "answered", answered_by: user.id, answered_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("user_id, subject, body")
    .maybeSingle();
  if (error || !request) {
    console.error("[inbox] answer failed", { id: id.data, error: error?.message ?? "not found" });
    back(formData, { error: "Could not save the answer." });
  }

  pushSoon(request.user_id);
  const to = await memberEmail(request.user_id);
  const emailed =
    to !== null &&
    (await sendEmail({
      to,
      subject: `Roni's team replied: ${request.subject ?? "your message"}`.slice(0, 150),
      text: [`Hi,`, "", answer.data, "", "—", `You wrote: ${request.body.slice(0, 500)}`, "", `See it in the app: ${siteUrl()}/help`].join("\n"),
    }));
  done();
  back(formData, { ok: emailed ? "Answer sent. The member was notified in the app and by email." : "Answer saved. The member was notified in the app (no email was sent — email isn't set up)." });
}

const StatusChange = z.enum(["open", "closed"]);

/** Close or reopen an item. */
export async function setRequestStatus(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = Id.safeParse(formData.get("id"));
  const status = StatusChange.safeParse(formData.get("new_status"));
  if (!id.success || !status.success) back(formData, { error: "Invalid request." });
  const { data, error } = await createServiceClient().from("support_requests").update({ status: status.data }).eq("id", id.data).select("id");
  if (error || !data?.length) {
    console.error("[inbox] status change failed", { id: id.data, error: error?.message ?? "not found" });
    back(formData, { error: error ? "Could not update the item." : "This item no longer exists." });
  }
  done();
  back(formData, { ok: status.data === "closed" ? "Closed." : "Reopened." });
}

/** Stories: record that the team approved it (closes it with a note to the member). Publishing is manual. */
export async function approveStory(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const id = Id.safeParse(formData.get("id"));
  const note = ApprovalNote.safeParse(formData.get("note") ?? undefined);
  if (!id.success || !note.success) back(formData, { error: "Invalid request." });
  const answer = note.data || "Thank you for sharing your story — Roni's team approved it.";
  const { data, error } = await createServiceClient()
    .from("support_requests")
    .update({ status: "closed", answer, answered_by: user.id, answered_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("kind", "story")
    .eq("consent_public", true)
    .select("id");
  if (error || !data?.length) {
    console.error("[inbox] approve story failed", { id: id.data, error: error?.message ?? "not a shareable story" });
    back(formData, { error: error ? "Could not approve the story." : "Only stories the member agreed to share can be approved." });
  }
  done();
  back(formData, { ok: "Story marked approved." });
}
