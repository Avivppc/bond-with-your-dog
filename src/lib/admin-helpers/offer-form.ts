/** What the offer form shows, so a failed save can hand the typed values back. Pure. */
export type PaymentType = "free" | "one_time" | "subscription";
export type AccessLevel = "full" | "limited";

export interface OfferFormValues {
  title: string;
  slug: string;
  description: string;
  payment_type: PaymentType;
  price: string;
  currency: string;
  interval: string;
  days_of_access: string;
  provider_price_id: string;
  status: "draft" | "published";
  includes_community: boolean;
  course_ids: string[];
  access_levels: Record<string, AccessLevel>;
}

export interface OfferFormState {
  error: string | null;
  values: OfferFormValues;
}

const MAX_FIELD = 5000;
const PAYMENT_TYPES: readonly PaymentType[] = ["free", "one_time", "subscription"];

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, MAX_FIELD) : "";
}

/** The submitted form as display values (never trusted: the action validates separately). */
export function formValues(formData: FormData): OfferFormValues {
  const paymentType = text(formData, "payment_type");
  const courseIds = formData.getAll("course_ids").filter((v): v is string => typeof v === "string" && v.length > 0);
  return {
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    payment_type: (PAYMENT_TYPES as readonly string[]).includes(paymentType) ? (paymentType as PaymentType) : "one_time",
    price: text(formData, "price"),
    currency: text(formData, "currency"),
    interval: text(formData, "interval"),
    days_of_access: text(formData, "days_of_access"),
    provider_price_id: text(formData, "provider_price_id"),
    status: text(formData, "status") === "published" ? "published" : "draft",
    includes_community: formData.get("includes_community") === "on",
    course_ids: courseIds,
    access_levels: Object.fromEntries(courseIds.map((id) => [id, formData.get(`access_level:${id}`) === "limited" ? "limited" : "full"])),
  };
}

/** "49" / "49.50" from cents ("" for nothing). */
export function priceText(cents: number): string {
  if (!cents) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
