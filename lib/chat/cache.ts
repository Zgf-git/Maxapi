import { env } from "@/lib/env";
import type { ChatCompletionRequestInput, ChatCompletionResponse } from "@/lib/providers/types";

const DEFAULT_CACHE_TTL_SECONDS = 60;

interface ChatCacheStore {
  get(key: string): Promise<ChatCompletionResponse | null>;
  set(key: string, value: ChatCompletionResponse, ttlSeconds: number): Promise<void>;
}

class MemoryChatCacheStore implements ChatCacheStore {
  private store = new Map<string, { value: ChatCompletionResponse; expiresAt: number }>();

  async get(key: string): Promise<ChatCompletionResponse | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: ChatCompletionResponse, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}

class UpstashChatCacheStore implements ChatCacheStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async get(key: string): Promise<ChatCompletionResponse | null> {
    const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { result: string | null };

    if (!payload.result) {
      return null;
    }

    try {
      return JSON.parse(payload.result) as ChatCompletionResponse;
    } catch {
      return null;
    }
  }

  async set(key: string, value: ChatCompletionResponse, ttlSeconds: number): Promise<void> {
    const response = await fetch(
      `${this.url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(
        JSON.stringify(value)
      )}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to write chat cache.");
    }
  }
}

function createChatCacheStore(): ChatCacheStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashChatCacheStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }

  return new MemoryChatCacheStore();
}

const cacheStore = createChatCacheStore();

function djb2Hash(str: string): string {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }

  return (hash >>> 0).toString(16);
}

function isCacheableInput(input: ChatCompletionRequestInput): boolean {
  return !input.stream;
}

export function buildCacheKey(input: ChatCompletionRequestInput): string {
  const payload = {
    model: input.model,
    route_policy: input.route_policy,
    session_id: input.session_id,
    messages: input.messages,
    temperature: input.temperature,
    top_p: input.top_p,
    max_tokens: input.max_tokens,
    stop: input.stop,
    tools: input.tools,
    tool_choice: input.tool_choice,
    response_format: input.response_format
  };

  return `chat:v1:${djb2Hash(JSON.stringify(payload))}`;
}

export async function getCachedChatResponse(
  input: ChatCompletionRequestInput
): Promise<ChatCompletionResponse | null> {
  if (!isCacheableInput(input)) {
    return null;
  }

  const key = buildCacheKey(input);

  return cacheStore.get(key);
}

export async function setCachedChatResponse(
  input: ChatCompletionRequestInput,
  response: ChatCompletionResponse,
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS
): Promise<void> {
  if (!isCacheableInput(input)) {
    return;
  }

  const key = buildCacheKey(input);

  await cacheStore.set(key, response, ttlSeconds);
}
