import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/email";
import { TIER_RESULTS } from "@/lib/quiz/data";

/**
 * Anyone can take the quiz, so this route sends email to an address a stranger typed. Keep it
 * useless for spam or phishing: a name can't carry a link, the email's link is always our own
 * site, and one address gets at most a few results emails a day.
 */
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,59}$/u;
const MAX_EMAILS_PER_ADDRESS_PER_DAY = 3;

const Body = z.object({
  firstName: z.string().trim().regex(NAME),
  email: z.string().email(),
  tier: z.enum(["foundations", "moves", "letsDance"]),
  scores: z.record(z.string(), z.number()),
  answers: z.record(z.string(), z.enum(["A", "B", "C"])),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { firstName, email, tier, scores, answers } = parsed.data;
  const result = TIER_RESULTS[tier];

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("quiz_leads").insert({
    first_name: firstName,
    email,
    tier,
    scores,
    answers,
  });
  if (dbError) {
    console.error("[quiz-leads] insert failed", dbError.message);
    return NextResponse.json({ error: "Please try again." }, { status: 502 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[quiz-leads] Resend not configured. Lead from", email, tier);
    return NextResponse.json({ ok: true, dev: true });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await createServiceClient()
    .from("quiz_leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (countError) {
    console.error("[quiz-leads] rate check failed", countError.message);
    return NextResponse.json({ ok: true, emailed: false });
  }
  // The row just saved counts too.
  if ((count ?? 0) > MAX_EMAILS_PER_ADDRESS_PER_DAY) return NextResponse.json({ ok: true, emailed: false });

  const baseUrl = siteUrl();

  const resend = new Resend(apiKey);
  const { error: emailError } = await resend.emails.send({
    from,
    to: email,
    subject: `${firstName}, here's your BONDED journey: ${result.headline}`,
    text: [
      `Hi ${firstName},`,
      "",
      result.personalization,
      "",
      result.headline,
      result.supporting,
      "",
      "You'll learn:",
      ...result.learn.map((item) => `- ${item}`),
      "",
      "Why this fits you:",
      result.supporting,
      "",
      result.firstLesson,
      "",
      "Welcome gift: " + result.welcomeOffer,
      "",
      `Ready to start? ${result.cta.label}: ${baseUrl}${result.cta.href}`,
    ].join("\n"),
  });

  if (emailError) {
    console.error("[quiz-leads] email failed", emailError.message);
    return NextResponse.json({ error: "We couldn't email your results. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
