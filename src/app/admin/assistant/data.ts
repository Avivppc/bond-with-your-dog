import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";

/** Reads for the admin "Assistant" pages (service role; callers have already run requireStaff). */

type ServiceClient = ReturnType<typeof createServiceClient>;

export const PAGE_SIZE = 25;
const DETAIL_MAX_MESSAGES = 500;

export interface ConversationRow {
  id: string;
  mode: "member" | "sales";
  created_at: string;
  last_message_at: string;
  message_count: number;
  handed_off: boolean;
  user_email: string | null;
  first_question: string | null;
  last_provider: string | null;
}

export async function loadConversationPage(sb: ServiceClient, page: number): Promise<{ rows: ConversationRow[]; total: number }> {
  const [list, count] = await Promise.all([
    sb.rpc("assistant_conversation_list", { p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
    sb.from("assistant_conversations").select("id", { count: "exact", head: true }),
  ]);
  if (list.error) throw new Error(`[assistant admin] list failed: ${list.error.message}`);
  if (count.error) throw new Error(`[assistant admin] count failed: ${count.error.message}`);
  return { rows: (list.data ?? []) as ConversationRow[], total: count.count ?? 0 };
}

export interface ConversationDetail {
  id: string;
  mode: "member" | "sales";
  createdAt: string;
  lastMessageAt: string;
  handedOff: boolean;
  page: string | null;
  email: string | null;
  lesson: { id: string; title: string; courseId: string } | null;
  messages: { id: string; role: "user" | "assistant"; content: string; provider: string | null; createdAt: string; tokens: string | null }[];
}

function tokenLabel(input: number | null, output: number | null): string | null {
  return input === null && output === null ? null : `${input ?? "?"} in · ${output ?? "?"} out`;
}

async function memberEmail(sb: ServiceClient, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await sb.auth.admin.getUserById(userId);
  if (error) console.error("[assistant admin] member lookup failed", { error: error.message });
  return data?.user?.email ?? null;
}

export async function loadConversation(sb: ServiceClient, id: string): Promise<ConversationDetail | null> {
  const { data: c, error } = await sb
    .from("assistant_conversations")
    .select("id, mode, user_id, lesson_id, page, created_at, last_message_at, handed_off, lessons(id, title, course_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[assistant admin] conversation failed: ${error.message}`);
  if (!c) return null;
  const [messages, email] = await Promise.all([
    sb
      .from("assistant_messages")
      .select("id, role, content, provider, input_tokens, output_tokens, created_at")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(DETAIL_MAX_MESSAGES),
    memberEmail(sb, c.user_id as string | null),
  ]);
  if (messages.error) throw new Error(`[assistant admin] messages failed: ${messages.error.message}`);
  const lesson = c.lessons as unknown as { id: string; title: string; course_id: string } | null;
  return {
    id: c.id as string,
    mode: c.mode as ConversationDetail["mode"],
    createdAt: c.created_at as string,
    lastMessageAt: c.last_message_at as string,
    handedOff: Boolean(c.handed_off),
    page: (c.page as string | null) ?? null,
    email,
    lesson: lesson ? { id: lesson.id, title: lesson.title, courseId: lesson.course_id } : null,
    messages: (messages.data ?? []).map((m) => ({
      id: m.id as string,
      role: m.role as "user" | "assistant",
      content: m.content as string,
      provider: (m.provider as string | null) ?? null,
      createdAt: m.created_at as string,
      tokens: tokenLabel(m.input_tokens as number | null, m.output_tokens as number | null),
    })),
  };
}

export const PROVIDER_LABEL: Readonly<Record<string, string>> = { local: "Your model", anthropic: "Claude Haiku" };
