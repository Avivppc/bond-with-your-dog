import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { submitSupport } from "@/lib/feedback/support";

const Body = z.object({
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(5000),
});

function pagePath(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

/**
 * "Ask Roni's team": the question is always saved to the support inbox first (the admin Inbox
 * answers it and the member sees the answer under Help); an email to the team follows when
 * email is configured. Success is only reported once the question is saved.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please add a subject and a few words about your question." }, { status: 400 });

  const result = await submitSupport(supabase, user.email ?? "", {
    kind: "question",
    subject: parsed.data.subject,
    body: parsed.data.message,
    pageUrl: pagePath(request.headers.get("referer")),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, id: result.id, emailed: result.emailed });
}
