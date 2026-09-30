import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

/** Link types the admin sends (Contacts → invite / password reset). */
const ALLOWED_TYPES: readonly EmailOtpType[] = ["invite", "recovery"];

/**
 * Verifies a one-time token_hash link (admin invitations and password resets) and signs the
 * person in on whatever device they open it, then continues to `next` (same-site only).
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
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("[auth/confirm] verify failed", { type, error: error.message });
    const expired = type === "recovery" ? "/forgot-password?error=That+link+has+expired.+Request+a+new+one." : "/login?error=auth-callback-failed";
    return NextResponse.redirect(`${origin}${expired}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
