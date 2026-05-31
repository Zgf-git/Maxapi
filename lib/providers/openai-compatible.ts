import { ApiRouteError, isRetryableUpstreamError } from "@/lib/chat/errors";
import { getCachedChatResponse, setCachedChatResponse } from "@/lib/chat/cache";
import { sanitizeProviderError } from "@/lib/chat/response";
import type {
  ChatCompletionInput,
  ChatCompletionResponse,
  ChatProvider,
  ChatStreamResult,
  EmbeddingRequestInput,
  EmbeddingResponse,
  ProviderName,
  RerankRequestInput,
  RerankResponse
} from "@/lib/providers/types";
import type { KeyPoolEntry, ProviderKeyPool } from "@/lib/providers/key-pool";

export type OpenAICompatibleProviderConfig = {
  provider: ProviderName;
  baseUrl: string;
  keyPool: ProviderKeyPool;
};

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function toChatBody(input: ChatCompletionInput) {
  return {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature,
    top_p: input.top_p,
    max_tokens: input.max_tokens,
    stream: input.stream ?? false,
    stop: input.stop,
    tools: input.tools,
    tool_choice: input.tool_choice,
    response_format: input.response_format,
    routing_strategy: undefined,
    stream_options: input.stream ? { include_usage: true } : undefined
  };
}

function toEmbeddingBody(input: EmbeddingRequestInput) {
  return {
    model: input.model,
    input: input.input,
    dimensions: input.dimensions,
    encoding_format: input.encoding_format,
    user: input.user
  };
}

function toRerankBody(input: RerankRequestInput) {
  return {
    model: input.model,
    query: input.query,
    documents: input.documents,
    top_n: input.top_n,
    return_documents: input.return_documents
  };
}

function unwrapOpenAICompatiblePayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    "id" in payload.data
  ) {
    return payload.data as T;
  }

  return payload as T;
}

async function parseErrorResponse(response: Response): Promise<ApiRouteError> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const sanitized = sanitizeProviderError(payload);

  if (response.status === 429 || response.status >= 500) {
    return new ApiRouteError(502, "upstream_error", sanitized.message, "retryable_upstream_error");
  }

  return new ApiRouteError(502, "upstream_error", sanitized.message, "non_retryable_upstream_error");
}

async function executeWithKeyPool<T>(
  pool: ProviderKeyPool,
  baseUrl: string,
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  onSuccess: (response: Response) => Promise<T>
): Promise<T> {
  const attempted = new Set<string>();
  let lastError: ApiRouteError | null = null;

  while (true) {
    const entry = pool.getNextKey();

    if (attempted.has(entry.id)) {
      break;
    }

    attempted.add(entry.id);

    let response: Response;
    const endpointUrl = endpoint(entry.baseUrlOverride ?? baseUrl, path);

    try {
      response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${entry.apiKey}`
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal
      });
    } catch {
      lastError = new ApiRouteError(502, "upstream_error", "Upstream request failed.", "retryable_upstream_error");
      pool.reportFailure(entry);
      continue;
    }

    if (response.ok) {
      pool.reportSuccess(entry);
      return onSuccess(response);
    }

    const error = await parseErrorResponse(response);

    if (!isRetryableUpstreamError(error)) {
      throw error;
    }

    pool.reportFailure(entry);
    lastError = error;
  }

  throw lastError ?? new ApiRouteError(502, "upstream_error", "All upstream keys failed.");
}

export class OpenAICompatibleProvider implements ChatProvider {
  constructor(private readonly config: OpenAICompatibleProviderConfig) {}

  getKeyPoolSnapshot() {
    return this.config.keyPool.getPublicSnapshot();
  }

  async createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResponse> {
    const cached = await getCachedChatResponse({ ...input, stream: false });

    if (cached) {
      return cached;
    }

    return executeWithKeyPool(
      this.config.keyPool,
      this.config.baseUrl,
      "/chat/completions",
      toChatBody({ ...input, stream: false }),
      undefined,
      async (response) => {
        const payload = unwrapOpenAICompatiblePayload<ChatCompletionResponse>(await response.json());

        await setCachedChatResponse({ ...input, stream: false }, payload);
        return payload;
      }
    );
  }

  async streamChatCompletion(input: ChatCompletionInput): Promise<ChatStreamResult> {
    const upstreamController = new AbortController();

    return executeWithKeyPool(
      this.config.keyPool,
      this.config.baseUrl,
      "/chat/completions",
      toChatBody({ ...input, stream: true }),
      upstreamController.signal,
      async (response) => {
        if (!response.body) {
          throw new ApiRouteError(
            502,
            "upstream_error",
            "Upstream provider returned an empty streaming body.",
            "retryable_upstream_error"
          );
        }

        return {
          stream: response.body,
          upstreamModel: input.model,
          status: response.status,
          abort: () => upstreamController.abort()
        };
      }
    );
  }

  async createEmbedding(input: EmbeddingRequestInput): Promise<EmbeddingResponse> {
    return executeWithKeyPool(
      this.config.keyPool,
      this.config.baseUrl,
      "/embeddings",
      toEmbeddingBody(input),
      undefined,
      async (response) => unwrapOpenAICompatiblePayload<EmbeddingResponse>(await response.json())
    );
  }

  async createRerank(input: RerankRequestInput): Promise<RerankResponse> {
    return executeWithKeyPool(
      this.config.keyPool,
      this.config.baseUrl,
      "/rerank",
      toRerankBody(input),
      undefined,
      async (response) => unwrapOpenAICompatiblePayload<RerankResponse>(await response.json())
    );
  }
}

export function toProviderRequestFailure(entry: KeyPoolEntry) {
  return entry;
}
