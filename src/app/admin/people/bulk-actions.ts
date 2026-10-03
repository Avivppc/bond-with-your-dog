"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeTag } from "@/lib/flows/actions";
import { exactLike } from "@/lib/flows/like";
import { mapWithConcurrency } from "@/lib/admin-helpers/concurrency";
import { DaysOfAccess } from "@/lib/admin-helpers/form-fields";
import { addContact } from "./_lib/access-server";

/** The contacts list shows 50 a page; a bulk action works on what's selected there. */
const MAX_SELECTED = 100;
const PARALLEL = 6;

const Bulk = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one contact.").max(MAX_SELECTED),
  action: z.enum(["tag", "untag", "grant"]),
  tag: z.string().max(60).optional(),
  offer_id: z.string().optional(),
  days: DaysOfAccess,
  return_to: z.string().max(500).optional(),
});

/** Only back to the contacts list (with its filters), never anywhere else. */
function backTo(returnTo: string | undefined, params: Record<string, string>): never {
  const base = returnTo?.startsWith("/admin/people") && !returnTo.startsWith("/admin/people/") ? returnTo : "/admin/people";
  const url = new URL(base, "http://x");
  ["ok", "error"].forEach((k) => url.searchParams.delete(k));
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  redirect(`${url.pathname}${url.search}`);
}

async function emailsOf(ids: readonly string[]): Promise<{ id: string; email: string }[]> {
  const sb = createServiceClient();
  const found = await mapWithConcurrency(ids, PARALLEL, async (id) => {
    const { data } = await sb.auth.admin.getUserById(id);
    return data.user?.email ? { id, email: data.user.email } : null;
  });
  return found.filter((f): f is { id: string; email: string } => f !== null);
}

const plural = (n: number) => `${n} contact${n === 1 ? "" : "s"}`;

/** Contacts list → bulk bar: tag, untag, or give an offer to the selected people. */
export async function bulkContacts(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const parsed = Bulk.safeParse({ ...Object.fromEntries(formData), ids: formData.getAll("ids") });
  const returnTo = typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : undefined;
  if (!parsed.success) backTo(returnTo, { error: parsed.error.issues[0]?.message ?? "Check the bulk action." });
  const { ids, action, days } = parsed.data;
  const people = await emailsOf(ids);
  const sb = createServiceClient();

  if (action === "tag" || action === "untag") {
    const tag = normalizeTag(parsed.data.tag ?? "");
    if (!tag) backTo(returnTo, { error: "Tags use letters, numbers, spaces and dashes (up to 40)." });
    // One at a time: the unique index is on lower(email), which an upsert can't target. A repeat
    // (23505) just means they already had the tag.
    const results = await mapWithConcurrency(people, PARALLEL, async (p) => {
      const { error } =
        action === "tag"
          ? await sb.from("contact_tags").insert({ email: p.email, user_id: p.id, tag, source: "admin" })
          : await sb.from("contact_tags").delete().eq("tag", tag).ilike("email", exactLike(p.email));
      if (error && error.code !== "23505") console.error("[people] bulk tag failed", { action, userId: p.id, error: error.message });
      return !error || error.code === "23505";
    });
    const failed = results.filter((ok) => !ok).length;
    revalidatePath("/admin/people", "layout");
    if (failed) backTo(returnTo, { error: `The tag change failed for ${plural(failed)}. Try again.` });
    backTo(returnTo, { ok: action === "tag" ? `Tagged ${plural(people.length)} "${tag}".` : `Removed "${tag}" from ${plural(people.length)}.` });
  }

  const offerId = z.string().uuid().safeParse(parsed.data.offer_id);
  if (!offerId.success) backTo(returnTo, { error: "Choose the offer to give." });
  const { data: offer } = await sb.from("offers").select("title").eq("id", offerId.data).maybeSingle();
  if (!offer) backTo(returnTo, { error: "That offer no longer exists." });
  const outcomes = await mapWithConcurrency(people, PARALLEL, (p) =>
    addContact(p.email, { offerId: offerId.data, offerTitle: offer.title, days, staffId: user.id, sendInvite: false }),
  );
  const failed = outcomes.filter((o) => o.status === "failed").length;
  revalidatePath("/admin/people", "layout");
  backTo(returnTo, failed ? { error: `Gave "${offer.title}" to ${plural(people.length - failed)}; ${failed} failed. Try those again from their pages.` } : { ok: `Gave "${offer.title}" to ${plural(people.length)}.` });
}
