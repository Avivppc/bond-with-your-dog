import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { FormField } from "@/app/admin/_components/FormField";
import { saveOffer } from "../actions";
import { Notice, PageHeader } from "@/app/admin/_components/ui";

export const dynamic = "force-dynamic";

interface OfferRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  payment_type: "free" | "one_time" | "subscription";
  price_cents: number;
  currency: string;
  interval: "month" | "year" | null;
  days_of_access: number | null;
  status: "draft" | "published";
  provider_price_id: string | null;
}

const EMPTY: OfferRow = {
  id: "new",
  title: "",
  slug: "",
  description: null,
  payment_type: "one_time",
  price_cents: 0,
  currency: "USD",
  interval: null,
  days_of_access: null,
  status: "draft",
  provider_price_id: null,
};

const selectClass = "px-4 py-2.5 rounded-[8px] border border-[#d9d8d6] bg-white";

export default async function EditOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("sales");
  const { id } = await params;
  const { saved, error } = await searchParams;
  const sb = createServiceClient();

  const [{ data: courses }, offerRes] = await Promise.all([
    sb.from("courses").select("id, title, paywall_after_module_id").order("title"),
    id === "new"
      ? Promise.resolve({ data: EMPTY })
      : sb.from("offers").select("*, offer_courses(course_id, access_level)").eq("id", id).maybeSingle(),
  ]);
  const offer = offerRes.data as (OfferRow & { offer_courses?: { course_id: string; access_level: string }[] }) | null;
  if (!offer) notFound();
  const levelOf = new Map((offer.offer_courses ?? []).map((c) => [c.course_id, c.access_level]));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={id === "new" ? "New offer" : offer.title}
        crumbs={[{ label: "Offers", href: "/admin/offers" }, { label: id === "new" ? "New offer" : offer.title }]}
      />
      {saved && <Notice tone="success">Saved.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form action={saveOffer} className="bg-white rounded-[12px] p-6 border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col gap-5">
        <input type="hidden" name="id" value={offer.id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Title" name="title" required defaultValue={offer.title} />
          <FormField label="Slug (checkout URL)" name="slug" required defaultValue={offer.slug} placeholder="foundations" />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#1a1a19]">Description</span>
          <textarea name="description" rows={2} maxLength={2000} defaultValue={offer.description ?? ""} className="px-4 py-2.5 rounded-[8px] border border-[#d9d8d6]" />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#1a1a19]">Type</span>
            <select name="payment_type" defaultValue={offer.payment_type} className={selectClass}>
              <option value="one_time">One-time payment</option>
              <option value="subscription">Subscription</option>
              <option value="free">Free</option>
            </select>
          </label>
          <FormField label="Price" name="price" defaultValue={offer.price_cents ? (offer.price_cents / 100).toString() : ""} placeholder="49" />
          <FormField label="Currency" name="currency" defaultValue={offer.currency} />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#1a1a19]">Billing (subscriptions)</span>
            <select name="interval" defaultValue={offer.interval ?? ""} className={selectClass}>
              <option value="">—</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Access length in days (one-time)"
            name="days_of_access"
            type="number"
            defaultValue={offer.days_of_access}
            hint="Blank = lifetime access"
          />
          <FormField
            label="Paddle price id"
            name="provider_price_id"
            defaultValue={offer.provider_price_id}
            placeholder="pri_…"
            hint="Create the product/price in Paddle, then paste its id here"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-[#1a1a19] mb-1">Courses unlocked by this offer</legend>
          {(courses ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#efeeed] px-3 py-2">
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="course_ids" value={c.id} defaultChecked={levelOf.has(c.id)} className="h-4 w-4 accent-[#343332]" />
                {c.title}
              </label>
              {c.paywall_after_module_id ? (
                <select
                  name={`access_level:${c.id}`}
                  defaultValue={levelOf.get(c.id) ?? "full"}
                  aria-label={`Access to ${c.title}`}
                  className="rounded-[8px] border border-[#d9d8d6] bg-white px-2 py-1 text-xs"
                >
                  <option value="full">Full access</option>
                  <option value="limited">Limited — above the paywall only</option>
                </select>
              ) : (
                <span className="text-xs text-[#9b9997]">Full access</span>
              )}
            </div>
          ))}
          <p className="text-xs text-[#6c6a69]">Limited access is available for courses with a paywall (set it in the course outline).</p>
        </fieldset>

        <label className="flex flex-col gap-1.5 max-w-48">
          <span className="text-sm font-medium text-[#1a1a19]">Status</span>
          <select name="status" defaultValue={offer.status} className={selectClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <button type="submit" className="bg-[#343332] text-white hover:bg-black px-6 py-3 rounded-full font-medium text-sm self-start">
          Save offer
        </button>
      </form>

      {id !== "new" && (
        <p className="text-sm text-[#6c6a69]">
          Checkout link:{" "}
          <Link href={`/checkout/${offer.slug}`} className="text-[#1a1a19] hover:underline font-bold" target="_blank">
            /checkout/{offer.slug}
          </Link>
        </p>
      )}
    </div>
  );
}
