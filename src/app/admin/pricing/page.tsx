import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, MUTED, PageHeader } from "../_components/ui";
import { PriceRow } from "./PriceRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chapter prices" };

interface OfferLink {
  course_id: string;
  offer_id: string;
  offers: { price_cents: number; status: string; payment_type: string } | null;
}

/** What members pay for each chapter, in dollars. Checkout, the in-app offer and flow emails read these prices. */
export default async function PricingPage() {
  await requireStaff("sales");
  const sb = createServiceClient();
  const [chaptersRes, linksRes] = await Promise.all([
    sb.from("courses").select("id, title, chapter_number, published").not("chapter_number", "is", null).order("chapter_number"),
    sb.from("offer_courses").select("course_id, offer_id, offers(price_cents, status, payment_type)").eq("access_level", "full"),
  ]);
  const all = (linksRes.data ?? []) as unknown as OfferLink[];
  // Offers that sell exactly one chapter (bundles are priced under Offers).
  const single = (offerId: string) => all.filter((l) => l.offer_id === offerId).length === 1;
  const links = all.filter((l) => l.offers?.payment_type === "one_time" && single(l.offer_id));
  const priceFor = (courseId: string) => {
    const offers = links.filter((l) => l.course_id === courseId).map((l) => l.offers!);
    return offers.find((o) => o.status === "published") ?? offers[0] ?? null;
  };

  return (
    <>
      <PageHeader title="Chapter prices" description="What members pay for each chapter, in US dollars. Discounts from email flows are taken off these prices." />
      <Card flush>
        {(chaptersRes.data ?? []).map((c) => {
          const offer = priceFor(c.id as string);
          return (
            <PriceRow
              key={c.id as string}
              courseId={c.id as string}
              title={c.title as string}
              chapterNumber={c.chapter_number as number}
              price={offer ? String(offer.price_cents / 100) : ""}
              status={offer?.status === "published" ? "published" : "draft"}
              coursePublished={Boolean(c.published)}
            />
          );
        })}
      </Card>
      <p className={`mt-4 text-[13px] ${MUTED}`}>Payments open once PayPlus is connected. Until then members see the price but can&apos;t complete a purchase.</p>
    </>
  );
}
