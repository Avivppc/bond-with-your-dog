import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { selectContext } from "./knowledge";
import { loadCurrentLesson, loadMemberChunks, loadSalesChunks } from "./knowledge-server";
import { safePagePath, submitSupport } from "@/lib/feedback/support";
import { complete } from "./llm";
import { buildSystemPrompt, parseReply } from "./prompt";
import { rateLimitDecision, windowStart } from "./rate-limit";
import { createConversation, loadHistory, ownedConversation, recordExchange, usageSince, type Exchange, type NewConversation, type Owner } from "./store";
import type { AssistantMode, AssistantReply, AssistantSettings, KnowledgeChunk } from "./types";

/** One question in, one saved reply out. The route has validated input and checked the switches. */

type ServiceClient = ReturnType<typeof createServiceClient>;
type UserClient = Awaited<ReturnType<typeof createClient>>;

export const REPLY_MAX_TOKENS = 700;
const QUESTION_MAX_CHARS = 2000;

export class AssistantRequestError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "AssistantRequestError";
  }
}

export type Caller =
  | { kind: "member"; userId: string; userClient: UserClient }
  | { kind: "visitor"; visitorId: string; ipHash: string };

export interface AskInput {
  mode: AssistantMode;
  message: string;
  conversationId?: string;
  lessonId?: string;
  page: string | null;
}

function ownerOf(caller: Caller): Owner {
  return caller.kind === "member" ? { kind: "member", userId: caller.userId } : { kind: "visitor", visitorId: caller.visitorId };
}

async function enforceRateLimit(sb: ServiceClient, mode: AssistantMode, caller: Caller): Promise<void> {
  const counts = await usageSince(
    sb,
    {
      userId: caller.kind === "member" ? caller.userId : null,
      visitorId: caller.kind === "visitor" ? caller.visitorId : null,
      ipHash: caller.kind === "visitor" ? caller.ipHash : null,
    },
    windowStart(new Date()),
  );
  const decision = rateLimitDecision(mode, counts);
  if (!decision.allowed) throw new AssistantRequestError(429, decision.message);
}

/** A member may ask about a lesson they can open (same rule as the lesson page). */
async function assertLessonAccess(caller: Caller, lessonId: string): Promise<void> {
  if (caller.kind !== "member") throw new AssistantRequestError(400, "Lessons can only be discussed inside the member area.");
  const { data, error } = await caller.userClient.rpc("can_access_lesson", { p_lesson_id: lessonId });
  if (error) throw new Error(`[assistant] lesson access check failed: ${error.message}`);
  if (!data) throw new AssistantRequestError(403, "You need access to this lesson to ask about it.");
}

interface Context {
  chunks: KnowledgeChunk[];
  lessonTitle: string | null;
}

async function memberContext(sb: ServiceClient, userId: string, lessonId: string | undefined, question: string): Promise<Context> {
  const [all, current] = await Promise.all([loadMemberChunks(sb, userId), lessonId ? loadCurrentLesson(sb, lessonId) : Promise.resolve(null)]);
  const pool = current ? [...current.chunks, ...all.filter((c) => c.docId !== current.docId)] : all;
  return { chunks: selectContext(pool, question, { pinnedDocId: current?.docId ?? null }), lessonTitle: current?.title ?? null };
}

async function salesContext(sb: ServiceClient, question: string): Promise<Context> {
  return { chunks: selectContext(await loadSalesChunks(sb), question), lessonTitle: null };
}

/**
 * Send the question privately to Roni's Inbox, as the member (like Help → Ask a question; the
 * support RPC has its own daily limit). Not the lesson's Questions tab: other members can read that.
 */
async function askRoni(caller: Caller, lessonId: string | undefined, lessonTitle: string | null, page: string | null, question: string): Promise<boolean> {
  if (caller.kind !== "member") return false;
  const { data } = await caller.userClient.auth.getUser();
  const where = lessonTitle ? ` on the lesson "${lessonTitle}"` : "";
  const result = await submitSupport(caller.userClient, data.user?.email ?? "", {
    kind: "question",
    subject: lessonTitle ? `From the assistant: ${lessonTitle}`.slice(0, 120) : "From the assistant",
    body: `${question.slice(0, QUESTION_MAX_CHARS)}\n\n(The assistant couldn't answer this${where}, so it passed it to you.)`,
    pageUrl: safePagePath(page),
  });
  if (!result.ok) {
    console.error("[assistant] handoff to the inbox failed", { lessonId, status: result.status });
    return false;
  }
  return true;
}

type PendingExchange = Omit<Exchange, "conversationId"> & { conversation: NewConversation };

/**
 * Save the question and reply (starting the conversation on its first message). A failed save is
 * logged and the member still gets the answer; the reply then carries no conversation id.
 */
async function saveExchange(sb: ServiceClient, existingId: string | null, pending: PendingExchange): Promise<string | null> {
  const { conversation, ...exchange } = pending;
  try {
    const conversationId = existingId ?? (await createConversation(sb, conversation));
    await recordExchange(sb, { ...exchange, conversationId });
    return conversationId;
  } catch (error: unknown) {
    console.error("[assistant] save failed", { error: error instanceof Error ? error.message : "unknown" });
    return existingId;
  }
}

export async function answerQuestion(sb: ServiceClient, input: AskInput, caller: Caller, settings: AssistantSettings): Promise<AssistantReply> {
  const lessonId = input.mode === "member" ? input.lessonId : undefined;
  await enforceRateLimit(sb, input.mode, caller);
  if (lessonId) await assertLessonAccess(caller, lessonId);

  const owner = ownerOf(caller);
  const [context, existingId] = await Promise.all([
    caller.kind === "member" ? memberContext(sb, caller.userId, lessonId, input.message) : salesContext(sb, input.message),
    ownedConversation(sb, input.conversationId, input.mode, owner),
  ]);
  const history = existingId ? await loadHistory(sb, existingId) : [];

  const result = await complete({
    system: buildSystemPrompt({ mode: input.mode, chunks: context.chunks, extraInstructions: settings.extraInstructions, lessonTitle: context.lessonTitle }),
    messages: [...history, { role: "user", content: input.message }],
    maxTokens: REPLY_MAX_TOKENS,
  });
  const parsed = parseReply(result.text, input.mode);
  const askedRoni = parsed.handedOff ? await askRoni(caller, lessonId, context.lessonTitle, input.page, input.message) : false;

  const conversationId = await saveExchange(sb, existingId, {
    conversation: { mode: input.mode, owner, lessonId: lessonId ?? null, page: input.page, ipHash: caller.kind === "visitor" ? caller.ipHash : null },
    question: input.message,
    reply: parsed.text,
    provider: result.provider,
    inputTokens: result.inputTokens ?? null,
    outputTokens: result.outputTokens ?? null,
    handedOff: parsed.handedOff,
  });
  return { reply: parsed.text, conversationId, handedOff: parsed.handedOff, askedRoni };
}
