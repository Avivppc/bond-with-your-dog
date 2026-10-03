import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ChatTurn, LlmProvider } from "./types";

/**
 * The assistant's model: the owner's own model (any OpenAI-compatible server such as Ollama or
 * LM Studio, e.g. behind a Cloudflare Tunnel) when ASSISTANT_LOCAL_URL is set, with Claude Haiku
 * as the fallback. Server code only: it reads API keys from the environment.
 * Never logs message content or keys — provider failures are logged with a status only.
 */

export const ANTHROPIC_MODEL = "claude-haiku-4-5";
export const DEFAULT_LOCAL_MODEL = "llama3.1";
export const LOCAL_TIMEOUT_MS = 20_000;
const ANTHROPIC_TIMEOUT_MS = 30_000;
const TEMPERATURE = 0.3;

export class AssistantUnavailableError extends Error {
  constructor() {
    super("assistant model unavailable");
    this.name = "AssistantUnavailableError";
  }
}

export interface CompleteInput {
  system: string;
  messages: readonly ChatTurn[];
  maxTokens: number;
}

export interface CompleteResult {
  text: string;
  provider: LlmProvider;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LocalConfig {
  baseUrl: string;
  model: string;
  apiKey: string | null;
}

export interface ProviderConfig {
  local: LocalConfig | null;
  anthropicApiKey: string | null;
}

type Env = Readonly<Record<string, string | undefined>>;

function parseLocalUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function readProviderConfig(env: Env = process.env): ProviderConfig {
  const baseUrl = parseLocalUrl(env.ASSISTANT_LOCAL_URL);
  return {
    local: baseUrl
      ? { baseUrl, model: env.ASSISTANT_LOCAL_MODEL?.trim() || DEFAULT_LOCAL_MODEL, apiKey: env.ASSISTANT_LOCAL_API_KEY?.trim() || null }
      : null,
    anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || null,
  };
}

export type ProviderSummary = { kind: "local"; host: string; hasFallback: boolean } | { kind: "anthropic" } | { kind: "none" };

/** What the admin sees: which model answers (never the keys). */
export function describeProvider(config: ProviderConfig): ProviderSummary {
  if (config.local) return { kind: "local", host: new URL(config.local.baseUrl).host, hasFallback: Boolean(config.anthropicApiKey) };
  if (config.anthropicApiKey) return { kind: "anthropic" };
  return { kind: "none" };
}

const LocalResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().optional(), completion_tokens: z.number().int().nonnegative().optional() }).nullish(),
});

function failureKind(error: unknown): string {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "timeout";
  return "network";
}

/** The owner's model; null on any failure so the caller falls back. */
async function completeLocal(config: LocalConfig, input: CompleteInput): Promise<CompleteResult | null> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  try {
    const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: input.system }, ...input.messages],
        max_tokens: input.maxTokens,
        temperature: TEMPERATURE,
        stream: false,
      }),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn("[assistant] local model failed", { status: res.status });
      return null;
    }
    const parsed = LocalResponse.safeParse(await res.json());
    const text = parsed.success ? (parsed.data.choices[0].message.content ?? "").trim() : "";
    if (!text) {
      console.warn("[assistant] local model failed", { status: "empty" });
      return null;
    }
    return {
      text,
      provider: "local",
      inputTokens: parsed.data?.usage?.prompt_tokens,
      outputTokens: parsed.data?.usage?.completion_tokens,
    };
  } catch (error: unknown) {
    console.warn("[assistant] local model failed", { status: failureKind(error) });
    return null;
  }
}

let anthropicClient: { key: string; client: Anthropic } | null = null;

function anthropicFor(apiKey: string): Anthropic {
  if (anthropicClient?.key !== apiKey) {
    anthropicClient = { key: apiKey, client: new Anthropic({ apiKey, maxRetries: 1, timeout: ANTHROPIC_TIMEOUT_MS }) };
  }
  return anthropicClient.client;
}

async function completeAnthropic(apiKey: string, input: CompleteInput): Promise<CompleteResult | null> {
  try {
    const response = await anthropicFor(apiKey).messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    if (!text) {
      console.warn("[assistant] Claude failed", { status: response.stop_reason ?? "empty" });
      return null;
    }
    return { text, provider: "anthropic", inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  } catch (error: unknown) {
    console.warn("[assistant] Claude failed", { status: error instanceof APIError ? (error.status ?? "connection") : "error" });
    return null;
  }
}

/** One reply: the owner's model first (if set up), then Claude Haiku. Throws AssistantUnavailableError when neither answers. */
export async function complete(input: CompleteInput, config: ProviderConfig = readProviderConfig()): Promise<CompleteResult> {
  const local = config.local ? await completeLocal(config.local, input) : null;
  if (local) return local;
  const claude = config.anthropicApiKey ? await completeAnthropic(config.anthropicApiKey, input) : null;
  if (claude) return claude;
  throw new AssistantUnavailableError();
}
