import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import type { UsageCounts } from "./rate-limit";
import type { AssistantMode, ChatTurn, LlmProvider } from "./types";

/** Conversations and messages (service role; the API has already identified the caller). */

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Turns of history sent with each question (a turn = a question and its reply). */
export const HISTORY_TURNS = 8;
const STORED_MAX_CHARS = 4000;

export type Owner = { kind: "member"; userId: string } | { kind: "visitor"; visitorId: string };

function fail(what: string, error: { message: string }): never {
  throw new Error(`[assistant] ${what} failed: ${error.message}`);
}

/** The conversation id if it exists, is in this mode and belongs to this member/visitor; else null. */
export async function ownedConversation(sb: ServiceClient, id: string | undefined, mode: AssistantMode, owner: Owner): Promise<string | null> {
  if (!id) return null;
  const { data, error } = await sb.from("assistant_conversations").select("id, mode, user_id, visitor_id").eq("id", id).maybeSingle();
  if (error) fail("conversation lookup", error);
  if (!data || data.mode !== mode) return null;
  const owns = owner.kind === "member" ? data.user_id === owner.userId : data.visitor_id === owner.visitorId;
  return owns ? (data.id as string) : null;
}

export interface NewConversation {
  mode: AssistantMode;
  owner: Owner;
  lessonId: string | null;
  page: string | null;
  ipHash: string | null;
}

export async function createConversation(sb: ServiceClient, input: NewConversation): Promise<string> {
  const { data, error } = await sb
    .from("assistant_conversations")
    .insert({
      mode: input.mode,
      user_id: input.owner.kind === "member" ? input.owner.userId : null,
      visitor_id: input.owner.kind === "visitor" ? input.owner.visitorId : null,
      lesson_id: input.lessonId,
      page: input.page,
      ip_hash: input.ipHash,
    })
    .select("id")
    .single();
  if (error) fail("conversation create", error);
  return data.id as string;
}

/** The last turns, oldest first. */
export async function loadHistory(sb: ServiceClient, conversationId: string): Promise<ChatTurn[]> {
  const { data, error } = await sb
    .from("assistant_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS * 2);
  if (error) fail("history load", error);
  const turns = (data ?? []).map((m) => ({ role: m.role as ChatTurn["role"], content: m.content as string })).reverse();
  // The model expects the conversation to start with a question.
  const firstQuestion = turns.findIndex((t) => t.role === "user");
  return firstQuestion < 0 ? [] : turns.slice(firstQuestion);
}

export interface Exchange {
  conversationId: string;
  question: string;
  reply: string;
  provider: LlmProvider;
  inputTokens: number | null;
  outputTokens: number | null;
  handedOff: boolean;
}

export async function recordExchange(sb: ServiceClient, exchange: Exchange): Promise<void> {
  const { error } = await sb.rpc("assistant_record_exchange", {
    p_conversation_id: exchange.conversationId,
    p_question: exchange.question.slice(0, STORED_MAX_CHARS),
    p_reply: exchange.reply.slice(0, STORED_MAX_CHARS),
    p_provider: exchange.provider,
    p_input_tokens: exchange.inputTokens,
    p_output_tokens: exchange.outputTokens,
    p_handed_off: exchange.handedOff,
  });
  if (error) fail("exchange save", error);
}

export interface UsageKeys {
  userId: string | null;
  visitorId: string | null;
  ipHash: string | null;
}

/** Questions asked since `since` by this member, visitor cookie and IP hash. */
export async function usageSince(sb: ServiceClient, keys: UsageKeys, since: Date): Promise<UsageCounts> {
  const { data, error } = await sb
    .rpc("assistant_usage", { p_user_id: keys.userId, p_visitor_id: keys.visitorId, p_ip_hash: keys.ipHash, p_since: since.toISOString() })
    .single();
  if (error) fail("usage count", error);
  const row = data as { user_count: number; visitor_count: number; ip_count: number } | null;
  return { user: row?.user_count ?? 0, visitor: row?.visitor_count ?? 0, ip: row?.ip_count ?? 0 };
}
