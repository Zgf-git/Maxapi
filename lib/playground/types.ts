import type { RoutePolicy } from "@/lib/providers/types";

export type PlaygroundPayload = {
  model?: string;
  route_policy?: RoutePolicy;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    tool_calls?: unknown[];
  }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type PlaygroundRequestDetail = {
  requestLogId: string;
  createdAt: string;
  requestedModel: string | null;
  requestedRoutePolicy: string | null;
  actualProvider: string;
  actualUpstreamModel: string | null;
  fallbackUsed: boolean;
  fallbackFromProvider: string | null;
  fallbackFromModel: string | null;
  routeReason: string | null;
  status: string;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  totalCostUsdMicros: string | null;
  ledgerStatus: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type PlaygroundActionResult =
  | {
      ok: true;
      requestPayload: PlaygroundPayload;
      responsePayload: unknown;
      assistantText: string;
      detail: PlaygroundRequestDetail;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      requestPayload?: PlaygroundPayload;
      detail?: PlaygroundRequestDetail | null;
    };
