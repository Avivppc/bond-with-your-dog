import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/turnstile";
import { loadAssistantSettings } from "@/lib/assistant/settings";
import { AssistantUnavailableError } from "@/lib/assistant/llm";
import { AssistantRequestError, answerQuestion, type Caller } from "@/lib/assistant/service";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, cleanPage, hashIp, ipSalt, newVisitorId, validVisitorId } from "@/lib/assistant/identity";
import { MESSAGE_MAX_CHARS } from "@/lib/assistant/types";

/**
 * "Ask Bonded": members ask about their lessons (signed in), visitors ask about the chapters
 * (anonymous, identified by an httpOnly cookie). Every exchange is saved for the admin.
 */

const Body = z.object({
  mode: z.enum(["member", "sales"]),
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1, "Write a question first.").max(MESSAGE_MAX_CHARS, `Keep it under ${MESSAGE_MAX_CHARS} characters.`),
  lessonId: z.uuid().optional(),
  page: z.string().max(500).optional(),
});

const OFF_MESSAGE = "The assistant isn't available right now.";
const UNAVAILABLE_MESSAGE = "I can't answer right now. Please try again in a little while.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function errorJson(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

/** The visitor's cookie id, issuing one (1 year, httpOnly) on the first question. */
async function visitorCaller(request: Request): Promise<Caller> {
  const store = await cookies();
  const existing = validVisitorId(store.get(VISITOR_COOKIE)?.value);
  const visitorId = existing ?? newVisitorId();
  if (!existing) {
    store.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  return { kind: "visitor", visitorId, ipHash: hashIp(clientIp(request.headers), ipSalt()) };
}

async function memberCaller(): Promise<Caller | null> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  return user ? { kind: "member", userId: user.id, userClient } : null;
}

/** Which chat surfaces are switched on (the sales launcher asks before it shows itself). */
export async function GET() {
  try {
    const settings = await loadAssistantSettings(createServiceClient());
    return NextResponse.json({ sales: settings.salesEnabled, members: settings.membersEnabled }, { headers: { "cache-control": "no-store" } });
  } catch (error: unknown) {
    console.error("[assistant] status failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ sales: false, members: false }, { headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorJson(400, parsed.error.issues[0]?.message ?? "Please check your question.");
  const input = parsed.data;

  try {
    const sb = createServiceClient();
    const settings = await loadAssistantSettings(sb);
    const enabled = input.mode === "member" ? settings.membersEnabled : settings.salesEnabled;
    if (!enabled) return errorJson(403, OFF_MESSAGE);

    const caller = input.mode === "member" ? await memberCaller() : await visitorCaller(request);
    if (!caller) return errorJson(401, "Please sign in again.");

    const reply = await answerQuestion(sb, { ...input, page: cleanPage(input.page) }, caller, settings);
    return NextResponse.json(reply, { headers: { "cache-control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof AssistantRequestError) return errorJson(error.status, error.publicMessage);
    if (error instanceof AssistantUnavailableError) return errorJson(503, UNAVAILABLE_MESSAGE);
    console.error("[assistant] request failed", { mode: input.mode, error: error instanceof Error ? error.message : "unknown" });
    return errorJson(500, GENERIC_MESSAGE);
  }
}
