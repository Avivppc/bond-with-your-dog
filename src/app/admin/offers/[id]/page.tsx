import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { priceText, type AccessLevel, type OfferFormState, type OfferFormValues } from "@/lib/admin-helpers/offer-form";
import { Notice, PageHeader } from "@/app/admin/_components/ui";
import { OfferForm, type OfferCourseOption } from "./OfferForm";

export const dynamic = "force-dynamic";

interface OfferRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  payment_type: OfferFormValues["payment_type"];
  price_cents: number;
  currency: string;
  interval: "month" | "year" | null;
  days_of_access: number | null;
  status: "draft" | "published";
  provider_price_id: string | null;
  includes_community: boolean;
  offer_courses: { course_id: string; access_level: AccessLevel }[] | null;
}

const NEW_OFFER: OfferFormValues = {
  title: "",
  slug: "",
  description: "",
  payment_type: "one_time",
  price: "",
  currency: "USD",
  interval: "",
  days_of_access: "",
  provider_price_id: "",
  status: "draft",
  includes_community: false,
  course_ids: [],
  access_levels: {},
};

const OfferId = z.string().uuid();

function toValues(offer: OfferRow): OfferFormValues {
  const links = offer.offer_courses ?? [];
  return {
    title: offer.title,
    slug: offer.slug,
    description: offer.description ?? "",
    payment_type: offer.payment_type,
    price: priceText(offer.price_cents),
    currency: offer.currency,
    interval: offer.interval ?? "",
    days_of_access: offer.days_of_access ? String(offer.days_of_access) : "",
    provider_price_id: offer.provider_price_id ?? "",
    status: offer.status,
    includes_community: offer.includes_community,
    course_ids: links.map((c) => c.course_id),
    access_levels: Object.fromEntries(links.map((c) => [c.course_id, c.access_level])),
  };
}

async function loadCourses(): Promise<OfferCourseOption[]> {
  const { data, error } = await createServiceClient().from("courses").select("id, title, paywall_after_module_id").order("title");
  if (error) console.error("[offers] course list failed", error.message);
  return (data ?? []).map((c) => ({ id: c.id, title: c.title, hasPaywall: Boolean(c.paywall_after_module_id) }));
}

async function loadOffer(id: string): Promise<OfferRow | null> {
  if (!OfferId.safeParse(id).success) return null;
  const { data, error } = await createServiceClient()
    .from("offers")
    .select("id, title, slug, description, payment_type, price_cents, currency, interval, days_of_access, status, provider_price_id, includes_community, offer_courses(course_id, access_level)")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("[offers] load failed", { id, error: error.message });
  return (data as OfferRow | null) ?? null;
}

export default async function EditOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("sales");
  const [{ id }, { saved, error }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [courses, offer] = await Promise.all([loadCourses(), isNew ? Promise.resolve(null) : loadOffer(id)]);
  if (!isNew && !offer) notFound();
  const initial: OfferFormState = { error: null, values: offer ? toValues(offer) : NEW_OFFER };
  const title = offer?.title ?? "New offer";

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={title} crumbs={[{ label: "Offers", href: "/admin/offers" }, { label: title }]} />
      {saved && <Notice tone="success">Offer saved.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}
      {offer && (
        <p className="text-[14px] text-[#6c6a69]">
          Checkout link:{" "}
          <Link href={`/checkout/${offer.slug}`} className="font-medium text-[#1a1a19] hover:underline" target="_blank">
            /checkout/{offer.slug}
          </Link>
          {offer.status === "draft" && " (draft — buyers can't use it until it's published)"}
        </p>
      )}
      {/* Keyed by the saved values, so the form starts fresh from the database after each save. */}
      <OfferForm key={`${id}:${JSON.stringify(initial.values)}`} id={offer?.id ?? "new"} courses={courses} initial={initial} />
    </div>
  );
}
