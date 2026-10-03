import { after, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimAccountViaGoogle, markEmailVerified } from "@/lib/auth/email-verification";
import { hasGoogleIdentity, hasVerifiedGoogleEmail } from "@/lib/auth/google-identity";
import { isFirstSignIn } from "@/lib/auth/new-user";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/welcome-email";
import { safeNext } from "@/lib/auth/safe-next";
import { MARKETING_CONSENT_COOKIE } from "@/lib/auth/marketing-consent";
import { REFERRAL_COOKIE } from "@/lib/referrals";
import { claimReferralCode } from "@/lib/referrals-server";
import { SIGNUP_COMPLETED_COOKIE, SIGNUP_MARKER_MAX_AGE_SECONDS } from "@/lib/signup-marker";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
  }
  const user = data.user;
  let isGoogleSignup = false;
  if (user && hasVerifiedGoogleEmail(user)) {
    // Must run before the proof is recorded: it checks whether the account was proven yet.
    await claimAccountViaGoogle(supabase, user);
    // A first Google login is a signup: send the welcome (no confirm step needed).
    if (isFirstSignIn(user) && user.email) {
      isGoogleSignup = true;
      const to = user.email;
      const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");
      after(() => sendEmail(welcomeEmail({ to, fullName, baseUrl: origin, verifyUrl: null })));
    }
  } else if (!hasGoogleIdentity(user)) {
    // Google is the only OAuth provider, so without it the code came from a link in their inbox.
    await markEmailVerified(user);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  if (isGoogleSignup) {
    response.cookies.set(SIGNUP_COMPLETED_COOKIE, "google", { maxAge: SIGNUP_MARKER_MAX_AGE_SECONDS, path: "/", sameSite: "lax" });
  }

  // Newsletter consent ticked before a Google sign-up travels via a short-lived cookie.
  const consented = request.cookies.get(MARKETING_CONSENT_COOKIE)?.value === "1";
  if (consented && data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString() })
      .eq("id", data.user.id);
    if (profileError) {
      console.error("[auth/callback] failed to store marketing consent", profileError.message);
    }
    response.cookies.set(MARKETING_CONSENT_COOKIE, "", { maxAge: 0, path: "/" });
  }

  const referralCode = request.cookies.get(REFERRAL_COOKIE)?.value;
  if (referralCode && data.user && (await claimReferralCode(supabase, referralCode))) {
    response.cookies.set(REFERRAL_COOKIE, "", { maxAge: 0, path: "/" });
  }

  return response;
}
