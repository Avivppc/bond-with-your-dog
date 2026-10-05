import { createServiceClient } from "@/lib/supabase/admin";
import { priceText } from "@/lib/admin-helpers/offer-form";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED } from "@/app/admin/_components/ui";
import { saveSellingTools } from "./selling-tools-actions";

interface ToolsRow {
  id: string;
  payment_type: string;
  currency: string;
  bump_offer_id: string | null;
  bump_price_cents: number | null;
  bump_headline: string | null;
  bump_text: string | null;
  upsell_offer_id: string | null;
  upsell_price_cents: number | null;
  upsell_headline: string | null;
  upsell_text: string | null;
  giftable: boolean;
  retention_percent: number | null;
  retention_cycles: number | null;
}

interface OfferOption {
  id: string;
  title: string;
  status: string;
  price_cents: number;
  currency: string;
}

function AddOnFields({
  prefix,
  title,
  hint,
  options,
  current,
}: {
  prefix: "bump" | "upsell";
  title: string;
  hint: string;
  options: readonly OfferOption[];
  current: { offerId: string | null; priceCents: number | null; headline: string | null; text: string | null };
}) {
  return (
    <fieldset className="space-y-3 rounded-[10px] border border-[#efeeed] p-4">
      <legend className="px-1 text-[15px] font-semibold">{title}</legend>
      <p className={`text-[13px] ${MUTED}`}>{hint}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Offer</span>
          <select name={`${prefix}_offer_id`} defaultValue={current.offerId ?? ""} className={INPUT}>
            <option value="">None</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} ({(o.price_cents / 100).toFixed(2)} {o.currency}){o.status === "draft" ? " — draft" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Special price</span>
          <input name={`${prefix}_price`} defaultValue={current.priceCents ? priceText(current.priceCents) : ""} placeholder="29" inputMode="decimal" className={INPUT} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Headline</span>
        <input
          name={`${prefix}_headline`}
          defaultValue={current.headline ?? ""}
          maxLength={120}
          placeholder={prefix === "bump" ? "Add the Moves Library" : "Take the next chapter at 40% off"}
          className={INPUT}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Text</span>
        <textarea name={`${prefix}_text`} defaultValue={current.text ?? ""} maxLength={prefix === "bump" ? 400 : 600} rows={2} className={INPUT} />
      </label>
    </fieldset>
  );
}

/**
 * Admin → Offer → Selling tools (Kajabi parity). Prices here are charged by a provider that charges
 * our amounts (PayPlus, once connected); until then they show in the local test checkout only.
 */
export async function SellingToolsCard({ offerId }: { offerId: string }) {
  const sb = createServiceClient();
  const [{ data: row }, { data: others }] = await Promise.all([
    sb
      .from("offers")
      .select(
        "id, payment_type, currency, bump_offer_id, bump_price_cents, bump_headline, bump_text, upsell_offer_id, upsell_price_cents, upsell_headline, upsell_text, giftable, retention_percent, retention_cycles",
      )
      .eq("id", offerId)
      .maybeSingle(),
    sb.from("offers").select("id, title, status, price_cents, currency").eq("payment_type", "one_time").neq("id", offerId).order("title"),
  ]);
  if (!row) return null;
  const offer = row as ToolsRow;
  const options = ((others ?? []) as OfferOption[]).filter((o) => o.currency === offer.currency);
  const oneTime = offer.payment_type === "one_time";
  const subscription = offer.payment_type === "subscription";

  return (
    <div id="selling-tools">
      <Card
        title="Selling tools"
        description="Extras that raise what each sale brings in. Codes, bumps and special prices are charged once online payments run through PayPlus."
      >
        <form action={saveSellingTools} className="space-y-5">
          <input type="hidden" name="offer_id" value={offer.id} />
          {oneTime && (
            <AddOnFields
              prefix="bump"
              title="Order bump"
              hint="A box on the checkout: one tick adds another offer to the same payment, at a special price."
              options={options}
              current={{ offerId: offer.bump_offer_id, priceCents: offer.bump_price_cents, headline: offer.bump_headline, text: offer.bump_text }}
            />
          )}
          <AddOnFields
            prefix="upsell"
            title="After-purchase offer"
            hint="Shown on the “You're in!” page right after a purchase, for 48 hours, at a special price."
            options={options}
            current={{ offerId: offer.upsell_offer_id, priceCents: offer.upsell_price_cents, headline: offer.upsell_headline, text: offer.upsell_text }}
          />
          {oneTime && (
            <label className="flex items-start gap-3 rounded-[10px] border border-[#efeeed] p-4">
              <input type="checkbox" name="giftable" defaultChecked={offer.giftable} className="mt-1 h-4 w-4 accent-[#343332]" />
              <span>
                <span className="block text-[15px] font-semibold">Can be bought as a gift</span>
                <span className={`block text-[13px] ${MUTED}`}>
                  Buyers enter the recipient&apos;s name and email. After payment the recipient gets an email and the access; the buyer doesn&apos;t.
                </span>
              </span>
            </label>
          )}
          {subscription && (
            <fieldset className="space-y-3 rounded-[10px] border border-[#efeeed] p-4">
              <legend className="px-1 text-[15px] font-semibold">Offer to stay</legend>
              <p className={`text-[13px] ${MUTED}`}>When a member cancels, offer them a discount on their next payments instead. Leave empty to cancel straight away.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Discount (%)</span>
                  <input name="retention_percent" type="number" min={1} max={100} defaultValue={offer.retention_percent ?? ""} className={INPUT} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>For how many payments</span>
                  <input name="retention_cycles" type="number" min={1} max={12} defaultValue={offer.retention_cycles ?? ""} className={INPUT} />
                </label>
              </div>
            </fieldset>
          )}
          <button type="submit" className={BTN_PRIMARY}>
            Save selling tools
          </button>
        </form>
      </Card>
    </div>
  );
}
