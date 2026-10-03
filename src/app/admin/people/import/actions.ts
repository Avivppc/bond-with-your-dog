"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { IMPORT_BATCH, importRowSchema } from "@/lib/contacts-import";
import { DaysOfAccess } from "@/lib/admin-helpers/form-fields";
import { mapWithConcurrency } from "@/lib/admin-helpers/concurrency";
import { addContact } from "../_lib/access-server";

const Batch = z.object({
  rows: z.array(importRowSchema).min(1).max(IMPORT_BATCH),
  offerId: z.string().uuid().nullable(),
  days: DaysOfAccess,
});

export interface ImportBatchResult {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  members: number;
  tagsAdded: number;
  /** With an offer: granted now (has an account) or waiting for sign-up. */
  granted: number;
  waiting: number;
  failed: { email: string; reason: string }[];
}

const EMPTY: ImportBatchResult = { ok: false, created: 0, updated: 0, members: 0, tagsAdded: 0, granted: 0, waiting: 0, failed: [] };
const PARALLEL = 4;

async function offerTitle(offerId: string): Promise<string | null> {
  const { data, error } = await createServiceClient().from("offers").select("title").eq("id", offerId).maybeSingle();
  if (error) console.error("[import] offer lookup failed", { offerId, error: error.message });
  return data?.title ?? null;
}

/**
 * One batch of an import (the browser sends a big file in batches). Saves contacts, consent and
 * tags in one database call; with an offer, each person also gets access (or it waits for their
 * sign-up), exactly like Add contacts.
 */
export async function importContactsBatch(input: unknown): Promise<ImportBatchResult> {
  const { user } = await requireStaff("sales");
  const parsed = Batch.safeParse(input);
  if (!parsed.success) return { ...EMPTY, error: parsed.error.issues[0]?.message ?? "Some rows couldn't be read." };
  const { rows, offerId, days } = parsed.data;

  const title = offerId ? await offerTitle(offerId) : null;
  if (offerId && !title) return { ...EMPTY, error: "That offer no longer exists. Pick another one." };

  const { data, error } = await createServiceClient().rpc("admin_import_contacts", { p_rows: rows, p_staff: user.id });
  const counts = (data as { contacts_created: number; contacts_updated: number; members_matched: number; tags_added: number }[] | null)?.[0];
  if (error || !counts) {
    console.error("[import] batch failed", { rows: rows.length, error: error?.message });
    return { ...EMPTY, error: "This batch couldn't be saved. Try the import again; rows already saved are simply updated." };
  }

  const outcomes = offerId
    ? await mapWithConcurrency(rows, PARALLEL, (r) => addContact(r.email, { offerId, offerTitle: title, days, staffId: user.id, sendInvite: false }))
    : [];
  revalidatePath("/admin/people", "layout");
  revalidatePath("/admin/leads");
  return {
    ok: true,
    created: Number(counts.contacts_created),
    updated: Number(counts.contacts_updated),
    members: Number(counts.members_matched),
    tagsAdded: Number(counts.tags_added),
    granted: outcomes.filter((o) => o.status === "granted").length,
    waiting: outcomes.filter((o) => o.status === "pending" || o.status === "already_invited").length,
    failed: outcomes.flatMap((o) => (o.status === "failed" ? [{ email: o.email, reason: o.reason }] : [])),
  };
}
