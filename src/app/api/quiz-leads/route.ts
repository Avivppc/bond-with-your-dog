import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { absoluteHref } from "@/lib/quiz/config";
import { loadQuizConfig } from "@/lib/quiz/config-server";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { notifyTeam } from "@/lib/notify-team";

/**
 * Anyone can take the quiz, so this route sends email to an address a stranger typed. Keep it
 * useless for spam or phishing: a name can't carry a link, the email's only link is the result's
 * button that staff set in the admin (validated as a site path or https), and one address gets at
 * most a few results emails a day.
 */
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,59}$/u;
const MAX_EMAILS_PER_ADDRESS_PER_DAY = 3;

const Body = z.object({
  firstName: z.string().trim().regex(NAME),
  email: z.string().email(),
  tier: z.enum(["foundations", "moves", "letsDance"]),
  scores: z.record(z.string(), z.number()),
  answers: z.record(z.string(), z.enum(["A", "B", "C"])),
  // The "email me tips and updates" box: without it they get only the result they asked for.
  marketingOptIn: z.boolean().default(false),
  captcha: z.string().max(2048).nullish(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { firstName, email, tier, scores, answers, marketingOptIn, captcha } = parsed.data;
  if (!(await verifyTurnstile(captcha, clientIp(request.headers)))) {
    return NextResponse.json({ error: "Please confirm you're not a robot and try again." }, { status: 403 });
  }

  // Only this route writes leads (after Turnstile), so consent can't be forged through the database API.
  const { error: dbError } = await createServiceClient().from("quiz_leads").insert({
    first_name: firstName,
    email,
    tier,
    scores,
    answers,
    marketing_opt_in: marketingOptIn,
  });
  if (dbError) {
    console.error("[quiz-leads] insert failed", dbError.message);
    return NextResponse.json({ error: "Please try again." }, { status: 502 });
  }
  // After the response, so the visitor never waits on the team's email.
  after(() =>
    notifyTeam("leads", {
      subject: `New quiz lead: ${firstName}`,
      lines: [`${firstName} (${email}) finished the website quiz.`, `Result: ${tier}`, `Newsletter: ${marketingOptIn ? "yes" : "no"}`],
      path: `/admin/leads?q=${encodeURIComponent(email)}`,
    }),
  );

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

  const { results } = await loadQuizConfig();
  const result = results[tier];

  const emailed = await sendEmail({
    to: email,
    art: "photo",
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
      "Ready to start?",
      "",
      `${result.cta.label}: ${absoluteHref(result.cta.href, siteUrl())}`,
    ].join("\n"),
  });

  if (!emailed) {
    return NextResponse.json({ error: "We couldn't email your results. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
