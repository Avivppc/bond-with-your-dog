/** Shared shapes for "Ask Bonded" (pure: safe to import from tests and client code). */

export type AssistantMode = "member" | "sales";

export type LlmProvider = "local" | "anthropic";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** One piece of reference content (a lesson, a chapter overview, an offer). */
export interface KnowledgeDoc {
  id: string;
  /** Where it comes from, shown to the model: "Foundations › Lesson 3: Spin". */
  title: string;
  text: string;
}

export interface KnowledgeChunk {
  docId: string;
  title: string;
  text: string;
  /** Position inside its doc (0-based). */
  index: number;
}

export interface AssistantSettings {
  membersEnabled: boolean;
  salesEnabled: boolean;
  extraInstructions: string | null;
}

export const DISABLED_SETTINGS: AssistantSettings = { membersEnabled: false, salesEnabled: false, extraInstructions: null };

/** What the API returns to the chat panel. */
export interface AssistantReply {
  reply: string;
  /** Null only when saving failed (the next message starts a new conversation). */
  conversationId: string | null;
  handedOff: boolean;
  askedRoni: boolean;
}

export const MESSAGE_MAX_CHARS = 1000;
export const EXTRA_INSTRUCTIONS_MAX_CHARS = 2000;
