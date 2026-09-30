"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { MAX_EMAILS_PER_BATCH, parseEmailList } from "@/lib/admin-helpers/email-list";
import { mapWithConcurrency } from "@/lib/admin-helpers/concurrency";
import { addContact, type ContactOutcome } from "../_lib/access-server";

export interface AddContactsValues {
  emails: string;
  offerId: string;
  days: string;
  sendInvite: boolean;
}

export interface AddContactsState {
  status: "idle" | "done" | "error";
  message: string;
  results: ContactOutcome[];
  invalid: string[];
  emailConfigured: boolean;
  /** What was submitted, so the form keeps it after a validation error (React resets forms). */
  values: AddContactsValues;
}

const PARALLEL = 4;

const FormSchema = z.object({
  emails: z.string().max(40_000, "That list is too long."),
  offer_id: z.union([z.literal(""), z.string().uuid("Choose an offer")]),
  days: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().max(36500).nullable()),
  send_invite: z.preprocess((v) => v === "on", z.boolean()),
});

const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

function fail(values: AddContactsValues, message: string, invalid: string[] = []): AddContactsState {
  return { status: "error", message, results: [], invalid, emailConfigured: emailConfigured(), values };
}

function submittedValues(formData: FormData): AddContactsValues {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v.slice(0, 40_000) : "";
  };
  return { emails: text("emails"), offerId: text("offer_id"), days: text("days"), sendInvite: formData.get("send_invite") === "on" };
}

async function offerTitle(offerId: string): Promise<string | null | undefined> {
  const { data, error } = await createServiceClient().from("offers").select("title").eq("id", offerId).maybeSingle();
  if (error) {
    console.error("[add-contacts] offer lookup failed", { offerId, error: error.message });
    return undefined;
  }
  return data?.title ?? null;
}

/** Kajabi's "Add contacts": up to 200 emails, an optional offer, and an optional invitation. */
export async function addContacts(_prev: AddContactsState, formData: FormData): Promise<AddContactsState> {
  const { user } = await requireStaff("sales");
  const values = submittedValues(formData);
  const parsed = FormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(values, parsed.error.issues[0].message);

  const list = parseEmailList(parsed.data.emails);
  if (list.tooMany) return fail(values, `Add up to ${MAX_EMAILS_PER_BATCH} emails at a time.`, list.invalid);
  if (list.invalid.length > 0) return fail(values, "Some entries aren't email addresses. Fix or remove them and try again.", list.invalid);
  if (list.emails.length === 0) return fail(values, "Paste at least one email address.");

  const offerId = parsed.data.offer_id || null;
  const title = offerId ? await offerTitle(offerId) : null;
  if (offerId && title === undefined) return fail(values, "Could not load that offer. Please try again.");
  if (offerId && title === null) return fail(values, "That offer no longer exists.");

  const results = await mapWithConcurrency(list.emails, PARALLEL, (email) =>
    addContact(email, { offerId, offerTitle: title ?? null, days: parsed.data.days, staffId: user.id, sendInvite: parsed.data.send_invite })
  );
  revalidatePath("/admin/people", "layout");
  const failed = results.filter((r) => r.status === "failed").length;
  return {
    status: "done",
    message: failed ? `${results.length - failed} of ${results.length} done — ${failed} failed (see below).` : `All ${results.length} done.`,
    results,
    invalid: [],
    emailConfigured: emailConfigured(),
    // Done: clear the list but keep the offer settings for the next batch.
    values: { ...values, emails: "" },
  };
}
