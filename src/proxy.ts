import { type NextRequest, type NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { REGION_COOKIE, policyForCountry } from "@/lib/consent/policy";

/** Vercel's geo header. Missing locally, which falls back to the strict (banner) policy. */
const COUNTRY_HEADER = "x-vercel-ip-country";
const ONE_DAY_SECONDS = 60 * 60 * 24;

/** Tells the browser which cookie policy applies before PostHog starts. Re-checked daily for travellers. */
function setConsentRegion(request: NextRequest, response: NextResponse): void {
  const policy = policyForCountry(request.headers.get(COUNTRY_HEADER));
  if (request.cookies.get(REGION_COOKIE)?.value === policy) return;
  response.cookies.set(REGION_COOKIE, policy, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_DAY_SECONDS,
  });
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  setConsentRegion(request, response);
  return response;
}

export const config = {
  matcher: [
    // `tails` is the PostHog reverse proxy; it needs no Supabase session refresh.
    "/((?!_next/static|_next/image|tails|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
