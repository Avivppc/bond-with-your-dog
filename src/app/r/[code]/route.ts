import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidReferralCode, REFERRAL_COOKIE } from "@/lib/referrals";
import { claimReferralCode } from "@/lib/referrals-server";

export const dynamic = "force-dynamic";

const COOKIE_DAYS = 30;

/**
 * A student's referral link. Remembers the code in a cookie so the friend's sign-up / first
 * checkout is attributed; a signed-in visitor is attributed right away.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  const response = NextResponse.redirect(new URL("/courses?ref=1", request.url));
  if (!isValidReferralCode(code)) return response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && (await claimReferralCode(supabase, code))) return response;

  response.cookies.set(REFERRAL_COOKIE, code, {
    maxAge: COOKIE_DAYS * 86_400,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
