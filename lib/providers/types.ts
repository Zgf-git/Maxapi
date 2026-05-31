export const ROUTE_POLICIES = ["cheap", "balanced", "premium", "auto"] as const;
export const PROVIDER_NAMES = ["openai", "apimart", "openrouter", "deepseek", "google"] as const;
export const ROUTING_STRATEGIES = ["priority", "cost"] as const;

export type RoutePolicy = (typeof ROUTE_POLICIES)[number];
export type ProviderName = (typeof PROVIDER_NAMES)[number];
export type RoutingStrategy = (typeof ROUTING_STRATEGIES)[number];

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: unknown[];
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
};

type ChatCompletionFields = {
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: {
    type: "json_object";
  };
};

export type ChatCompletionRequestInput = ChatCompletionFields & {
  model?: string;
  route_policy?: RoutePolicy;
  routing_strategy?: RoutingStrategy;
  session_id?: string;
};

export type ChatCompletionInput = ChatCompletionFields & {
  model: string;
};

export type ChatCompletionUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  prompt_tokens_details?: {
    cached_tokens?: number | null;
  } | null;
  completion_tokens_details?: {
    reasoning_tokens?: number | null;
  } | null;
};

export type ChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string | null;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: unknown[];
    };
  }>;
  usage?: ChatCompletionUsage | null;
};

export type ChatStreamResult = {
  stream: ReadableStream<Uint8Array>;
  upstreamModel: string | null;
  status: number;
  abort?: () => void;
};

export type EmbeddingRequestInput = {
  model: string;
  input: string | string[];
  dimensions?: number;
  encoding_format?: "float" | "base64";
  user?: string;
};

export type RerankRequestInput = {
  model: string;
  query: string;
  documents: string[];
  top_n?: number;
  return_documents?: boolean;
};

export type EmbeddingUsage = {
  prompt_tokens?: number | null;
  total_tokens?: number | null;
};

export type RerankUsage = {
  total_tokens?: number | null;
};

export type EmbeddingResponse = {
  object: "list";
  data: Array<{
    object: "embedding";
    embedding: number[] | string;
    index: number;
  }>;
  model: string;
  usage?: EmbeddingUsage | null;
};

export type RerankResponse = {
  model?: string;
  results: Array<{
    index: number;
    relevance_score: number;
    document?: {
      text?: string;
    } | string;
  }>;
  usage?: RerankUsage | null;
};

export type ProviderErrorShape = {
  status: number;
  code: string;
  message: string;
};

export interface ChatProvider {
  createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResponse>;
  streamChatCompletion(input: ChatCompletionInput): Promise<ChatStreamResult>;
  createEmbedding(input: EmbeddingRequestInput): Promise<EmbeddingResponse>;
  createRerank(input: RerankRequestInput): Promise<RerankResponse>;
  getKeyPoolSnapshot(): Array<{
    id: string;
    baseUrlOverride: string | null;
    isHealthy: boolean;
    consecutiveFailures: number;
    lastFailureAt: Date | null;
    cooldownUntil: Date | null;
    totalRequests: number;
    totalFailures: number;
  }>;
}
