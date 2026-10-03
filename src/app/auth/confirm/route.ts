import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { markEmailVerified, secureUnprovenAccount } from "@/lib/auth/email-verification";

/**
 * Link types we accept: admin invitations and password resets (Contacts), the welcome email's
 * "confirm your email" link, plus Supabase's own emails once their templates point here
 * (signup confirmation, email change, magic link).
 */
const ALLOWED_TYPES: readonly EmailOtpType[] = ["invite", "recovery", "signup", "email", "email_change", "magiclink"];

/**
 * Verifies a one-time token_hash link and signs the person in on whatever device they open it
 * (unlike /auth/callback's code flow, which only works in the browser that asked), then
 * continues to `next` (same-site only). Opening the link proves the inbox, so it also records
 * the email as verified (unlocking access granted by email).
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
  // Already signed in to this same account here? Then the clicker is also whoever set its password.
  const {
    data: { user: signedInBefore },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("[auth/confirm] verify failed", { type, error: error.message });
    const expired =
      type === "recovery"
        ? "/forgot-password?error=That+link+has+expired.+Request+a+new+one."
        : type === "magiclink"
          ? "/home?verify=expired"
          : "/login?error=link-expired";
    return NextResponse.redirect(`${origin}${expired}`);
  }
  const user = data.user;
  if (!user) return NextResponse.redirect(`${origin}${next}`);
  // Opened elsewhere: an unproven password may belong to someone who registered this address.
  const passwordReplaced = signedInBefore?.id !== user.id && (await secureUnprovenAccount(supabase, user));
  await markEmailVerified(user);
  if (passwordReplaced && next !== "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password?notice=secured`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
