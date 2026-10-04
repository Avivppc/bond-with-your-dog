import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { AFFILIATE_COOKIE, AFFILIATE_COOKIE_DAYS, isAffiliateCode, safeLandingPath } from "@/lib/affiliates/rules";

export const dynamic = "force-dynamic";

/**
 * An affiliate's link (bonded.dog/a/<code>, optionally ?to=/a/page/on/our/site). Counts the visit
 * and remembers the affiliate for 30 days, so a purchase in that time earns their commission.
 * The latest link wins.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  const response = NextResponse.redirect(new URL(safeLandingPath(request.nextUrl.searchParams.get("to")), request.url));
  if (!isAffiliateCode(code)) return response;

  const { data: affiliateId, error } = await createServiceClient().rpc("record_affiliate_visit", { p_code: code });
  if (error) console.error("[affiliates] visit failed", { code, error: error.message });
  if (!affiliateId) return response;

  response.cookies.set(AFFILIATE_COOKIE, code, {
    maxAge: AFFILIATE_COOKIE_DAYS * 86_400,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
