import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { MARKETING_CONSENT_COOKIE } from "@/lib/auth/marketing-consent";


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

  const response = NextResponse.redirect(`${origin}${next}`);

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

  return response;
}
