import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { TIER_RESULTS } from "@/lib/quiz/data";

const Body = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email(),
  tier: z.enum(["foundations", "movement", "masterpiece"]),
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
    return NextResponse.json({ error: dbError.message }, { status: 502 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[quiz-leads] Resend not configured. Lead from", email, tier);
    return NextResponse.json({ ok: true, dev: true });
  }

  const baseUrl = request.headers.get("origin") ?? new URL(request.url).origin;

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
    return NextResponse.json({ error: emailError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
