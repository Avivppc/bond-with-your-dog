import { z } from "zod";
import { ANALYTICS_CATEGORY } from "./policy";

const COUNTRY_HEADER = "x-vercel-ip-country";
const COUNTRY_CODE = /^[A-Z]{2}$/;

const Body = z.object({
  consentId: z.string().uuid(),
  categories: z.array(z.enum(["necessary", ANALYTICS_CATEGORY])).max(10),
  acceptType: z.enum(["all", "necessary", "custom"]),
  policy: z.enum(["opt_in", "opt_out"]),
  revision: z.number().int().min(0),
});

export type ConsentRecordInput = z.infer<typeof Body>;

/** The slice of the Supabase server client this needs, so tests can pass a fake. */
export interface ConsentStore {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
  from(table: "consent_records"): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  };
}

/**
 * Logs one cookie choice (consent_records) as proof of consent. The country
 * comes from Vercel, never from the browser; the member is attached when signed in.
 */
export async function recordConsent(request: Request, store: ConsentStore): Promise<Response> {
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid input" }, { status: 400 });
  }

  const country = request.headers.get(COUNTRY_HEADER);
  const {
    data: { user },
  } = await store.auth.getUser();

  const { consentId, categories, acceptType, policy, revision } = parsed.data;
  const { error } = await store.from("consent_records").insert({
    consent_id: consentId,
    categories,
    accept_type: acceptType,
    policy,
    revision,
    country: country && COUNTRY_CODE.test(country) ? country : null,
    user_id: user?.id ?? null,
  });
  if (error) {
    console.error("[consent] insert failed", error.message);
    return Response.json({ error: "could not save consent" }, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
