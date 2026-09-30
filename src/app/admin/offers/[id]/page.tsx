import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { FormField } from "@/app/admin/_components/FormField";
import { saveOffer } from "../actions";

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

const selectClass = "px-4 py-2.5 rounded-lg border border-slate-200 bg-white";

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
    sb.from("courses").select("id, title").order("title"),
    id === "new"
      ? Promise.resolve({ data: EMPTY })
      : sb.from("offers").select("*, offer_courses(course_id)").eq("id", id).maybeSingle(),
  ]);
  const offer = offerRes.data as (OfferRow & { offer_courses?: { course_id: string }[] }) | null;
  if (!offer) notFound();
  const selected = new Set((offer.offer_courses ?? []).map((c) => c.course_id));

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/offers" className="text-sm font-bold text-orange-700 inline-block">
        ← Offers
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tighter">{id === "new" ? "New offer" : offer.title}</h1>
      {saved && <p role="status" className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">Saved.</p>}
      {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <form action={saveOffer} className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <input type="hidden" name="id" value={offer.id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Title" name="title" required defaultValue={offer.title} />
          <FormField label="Slug (checkout URL)" name="slug" required defaultValue={offer.slug} placeholder="foundations" />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</span>
          <textarea name="description" rows={2} maxLength={2000} defaultValue={offer.description ?? ""} className="px-4 py-2.5 rounded-lg border border-slate-200" />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Type</span>
            <select name="payment_type" defaultValue={offer.payment_type} className={selectClass}>
              <option value="one_time">One-time payment</option>
              <option value="subscription">Subscription</option>
              <option value="free">Free</option>
            </select>
          </label>
          <FormField label="Price" name="price" defaultValue={offer.price_cents ? (offer.price_cents / 100).toString() : ""} placeholder="49" />
          <FormField label="Currency" name="currency" defaultValue={offer.currency} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Billing (subscriptions)</span>
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
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Courses unlocked by this offer</legend>
          {(courses ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="course_ids" value={c.id} defaultChecked={selected.has(c.id)} className="w-4 h-4" />
              {c.title}
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1.5 max-w-48">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Status</span>
          <select name="status" defaultValue={offer.status} className={selectClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <button type="submit" className="bg-orange-700 text-white px-6 py-3 rounded-full font-bold text-sm self-start">
          Save offer
        </button>
      </form>

      {id !== "new" && (
        <p className="text-sm text-slate-600">
          Checkout link:{" "}
          <Link href={`/checkout/${offer.slug}`} className="text-orange-700 font-bold" target="_blank">
            /checkout/{offer.slug}
          </Link>
        </p>
      )}
    </div>
  );
}
