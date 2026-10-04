import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { MARKETING_CONSENT_COOKIE, consentEvidence, isFreshGoogleSignup, requestCountry } from "@/lib/auth/marketing-consent";
import { REFERRAL_COOKIE } from "@/lib/referrals";
import { claimReferralCode } from "@/lib/referrals-server";
import { markEmailVerified } from "@/lib/auth/email-verification";


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
  // Every way here proves the inbox: Google (verified address), a confirmation or reset link.
  await markEmailVerified(data.user);

  const response = NextResponse.redirect(`${origin}${next}`);

  // Newsletter consent ticked before a Google sign-up travels via a short-lived cookie. It counts only
  // for the sign-up itself: an existing member signing in with the same button keeps their own choice.
  const consentCookie = request.cookies.get(MARKETING_CONSENT_COOKIE)?.value === "1";
  const freshGoogleSignup =
    data.user !== null &&
    isFreshGoogleSignup({
      provider: data.user.app_metadata?.provider,
      createdAt: data.user.created_at,
      lastSignInAt: data.user.last_sign_in_at,
    });
  if (consentCookie && freshGoogleSignup && data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        marketing_opt_in: true,
        marketing_opt_in_at: new Date().toISOString(),
        ...consentEvidence("signup_google", requestCountry(request.headers)),
      })
      .eq("id", data.user.id);
    if (profileError) {
      console.error("[auth/callback] failed to store marketing consent", profileError.message);
    }
  }
  // The cookie is single-use whatever happened, so it can't carry over to another sign-in.
  if (consentCookie) response.cookies.set(MARKETING_CONSENT_COOKIE, "", { maxAge: 0, path: "/" });

  const referralCode = request.cookies.get(REFERRAL_COOKIE)?.value;
  if (referralCode && data.user && (await claimReferralCode(supabase, referralCode))) {
    response.cookies.set(REFERRAL_COOKIE, "", { maxAge: 0, path: "/" });
  }

  return response;
}
