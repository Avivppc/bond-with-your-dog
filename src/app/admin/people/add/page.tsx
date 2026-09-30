import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, Notice, PageHeader } from "../../_components/ui";
import { shortDate } from "../../_components/list-kit";
import { cancelAccessInvite } from "../../students/actions";
import { loadOfferOptions } from "../_lib/person-data";
import { AddContactsForm } from "./AddContactsForm";
import type { AddContactsState } from "./actions";

export const dynamic = "force-dynamic";

async function loadPendingInvites() {
  const { data, error } = await createServiceClient()
    .from("access_invites")
    .select("id, email, created_at, offers(title)")
    .is("claimed_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("[add-contacts] pending invites failed", error.message);
  return (data ?? []).map((i) => ({ id: i.id, email: i.email, created_at: i.created_at, offer: (i.offers as unknown as { title: string } | null)?.title ?? null }));
}

export default async function AddContactsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("sales");
  const { ok, error } = await searchParams;
  const [offers, invites] = await Promise.all([loadOfferOptions(), loadPendingInvites()]);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const initial: AddContactsState = {
    status: "idle",
    message: "",
    results: [],
    invalid: [],
    emailConfigured,
    values: { emails: "", offerId: "", days: "", sendInvite: true },
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Add contacts"
        crumbs={[{ label: "Contacts", href: "/admin/people" }, { label: "Add contacts" }]}
        description="People with an account get the offer right away. Useful for moving students over from Kajabi."
      />
      {typeof ok === "string" && <Notice tone="success">{ok}</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}
      <Card>
        <AddContactsForm offers={offers} emailConfigured={emailConfigured} initial={initial} />
      </Card>
      {invites.length > 0 && (
        <Card title="Waiting for sign-up" description="Offers saved for emails without an account. They unlock when that person signs up." flush>
          <ul className="divide-y divide-[#efeeed] text-[14px]">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                <span>
                  <b>{inv.email}</b> <span className="text-[#6c6a69]">· {inv.offer ?? "an offer"} · since {shortDate(inv.created_at)}</span>
                </span>
                <form action={cancelAccessInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <input type="hidden" name="return_to" value="/admin/people/add" />
                  <button type="submit" className="text-[12px] font-medium text-red-700 hover:underline">
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
