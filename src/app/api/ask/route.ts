import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(5000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.COACH_INBOX;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !inbox || !from) {
    // Don't fail loudly in dev — log the question and return ok so the UI works.
    console.warn("[ask] Resend not configured. Question from", user.email, parsed.data);
    return NextResponse.json({ ok: true, dev: true });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: inbox,
    replyTo: user.email,
    subject: `[Ask] ${parsed.data.subject}`,
    text: `From: ${user.email}\n\n${parsed.data.message}`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
