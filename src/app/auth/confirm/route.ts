import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { markEmailVerified } from "@/lib/auth/email-verification";

/**
 * Link types we accept: admin invitations and password resets (Contacts), plus Supabase's own
 * emails once their templates point here (signup confirmation, email change, magic link).
 */
const ALLOWED_TYPES: readonly EmailOtpType[] = ["invite", "recovery", "signup", "email", "email_change", "magiclink"];

/**
 * Verifies a one-time token_hash link and signs the person in on whatever device they open it
 * (unlike /auth/callback's code flow, which only works in the browser that asked), then
 * continues to `next` (same-site only).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), "/home");

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (!error) await markEmailVerified(data.user); // the link arrived in their inbox
  if (error) {
    console.error("[auth/confirm] verify failed", { type, error: error.message });
    const expired = type === "recovery" ? "/forgot-password?error=That+link+has+expired.+Request+a+new+one." : "/login?error=link-expired";
    return NextResponse.redirect(`${origin}${expired}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
