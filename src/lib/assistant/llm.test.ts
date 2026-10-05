import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { createMock, APIErrorMock } = vi.hoisted(() => {
  class APIErrorMock extends Error {
    constructor(readonly status: number | undefined) {
      super("api error");
    }
  }
  return { createMock: vi.fn(), APIErrorMock };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
  APIError: APIErrorMock,
}));

import { ANTHROPIC_MODEL, AssistantUnavailableError, complete, describeProvider, readProviderConfig, type ProviderConfig } from "./llm";

const input = { system: "SYSTEM", messages: [{ role: "user" as const, content: "How do I teach a spin?" }], maxTokens: 300 };
const LOCAL: ProviderConfig = { local: { baseUrl: "https://pc.example.com", model: "llama3.1", apiKey: "local-key" }, anthropicApiKey: "sk-test" };

const claudeReply = (text: string) => ({ content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 120, output_tokens: 30 } });
const localResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  createMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("readProviderConfig / describeProvider", () => {
  test("reads the local model, its default name and the Claude key", () => {
    const config = readProviderConfig({ ASSISTANT_LOCAL_URL: "https://pc.example.com/", ANTHROPIC_API_KEY: "sk" });
    expect(config).toEqual({ local: { baseUrl: "https://pc.example.com", model: "llama3.1", apiKey: null }, anthropicApiKey: "sk" });
    expect(describeProvider(config)).toEqual({ kind: "local", host: "pc.example.com", hasFallback: true });
  });

  test("ignores a malformed local URL", () => {
    const config = readProviderConfig({ ASSISTANT_LOCAL_URL: "ftp://nope", ANTHROPIC_API_KEY: "sk" });
    expect(config.local).toBeNull();
    expect(describeProvider(config)).toEqual({ kind: "anthropic" });
    expect(describeProvider(readProviderConfig({}))).toEqual({ kind: "none" });
  });
});

describe("complete", () => {
  test("uses the owner's model first (OpenAI-compatible, with the bearer key)", async () => {
    fetchMock.mockResolvedValue(localResponse({ choices: [{ message: { content: " Lure in a circle. " } }], usage: { prompt_tokens: 50, completion_tokens: 8 } }));
    const result = await complete(input, LOCAL);
    expect(result).toEqual({ text: "Lure in a circle.", provider: "local", inputTokens: 50, outputTokens: 8 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://pc.example.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer local-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("llama3.1");
    expect(body.messages[0]).toEqual({ role: "system", content: "SYSTEM" });
    expect(body.messages[1]).toEqual(input.messages[0]);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(createMock).not.toHaveBeenCalled();
  });

  test.each([
    ["a server error", () => fetchMock.mockResolvedValue(localResponse({ error: "down" }, 502))],
    ["an empty answer", () => fetchMock.mockResolvedValue(localResponse({ choices: [{ message: { content: "  " } }] }))],
    ["a malformed answer", () => fetchMock.mockResolvedValue(localResponse({ nope: true }))],
    ["a timeout", () => fetchMock.mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }))],
    ["a network error", () => fetchMock.mockRejectedValue(new TypeError("fetch failed"))],
  ])("falls back to Claude Haiku on %s", async (_label, arrange) => {
    arrange();
    createMock.mockResolvedValue(claudeReply("Use a lure."));
    const result = await complete(input, LOCAL);
    expect(result).toEqual({ text: "Use a lure.", provider: "anthropic", inputTokens: 120, outputTokens: 30 });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ model: ANTHROPIC_MODEL, system: "SYSTEM", max_tokens: 300, messages: input.messages }));
  });

  test("logs a provider failure with its status only (no content, no keys)", async () => {
    fetchMock.mockResolvedValue(localResponse({ error: "down" }, 503));
    createMock.mockResolvedValue(claudeReply("ok"));
    await complete(input, LOCAL);
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain("503");
    expect(logged).not.toContain("spin");
    expect(logged).not.toContain("local-key");
    expect(logged).not.toContain("sk-test");
  });

  test("goes straight to Claude when no local model is set", async () => {
    createMock.mockResolvedValue(claudeReply("Hi"));
    const result = await complete(input, { local: null, anthropicApiKey: "sk-test" });
    expect(result.provider).toBe("anthropic");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("throws AssistantUnavailableError when both fail", async () => {
    fetchMock.mockResolvedValue(localResponse({}, 500));
    createMock.mockRejectedValue(new APIErrorMock(529));
    await expect(complete(input, LOCAL)).rejects.toBeInstanceOf(AssistantUnavailableError);
  });

  test("throws AssistantUnavailableError when nothing is configured", async () => {
    await expect(complete(input, { local: null, anthropicApiKey: null })).rejects.toBeInstanceOf(AssistantUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  test("treats an empty Claude reply as a failure", async () => {
    createMock.mockResolvedValue({ content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } });
    await expect(complete(input, { local: null, anthropicApiKey: "sk-test" })).rejects.toBeInstanceOf(AssistantUnavailableError);
  });
});
