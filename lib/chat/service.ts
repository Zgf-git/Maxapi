import { RequestLogStatus, RequestType, UsageLedgerStatus } from "@prisma/client";

import { markApiKeyAuthenticatedUsage } from "@/lib/api-auth";
import { finalizeUsageCharge, markUsageLedgerState } from "@/lib/billing/ledger";
import type { ProviderUsageSnapshot } from "@/lib/billing/types";
import {
  ApiRouteError,
  isRetryableUpstreamError,
  markErrorLogged,
  sanitizeErrorMessage
} from "@/lib/chat/errors";
import { getChatProvider } from "@/lib/providers/registry";
import type {
  ChatCompletionInput,
  ChatCompletionRequestInput,
  ChatCompletionResponse,
  ChatCompletionUsage,
  ProviderName
} from "@/lib/providers/types";
import { createRequestLog, updateRequestLog } from "@/lib/request-logs/repository";
import { resolveChatRoute } from "@/lib/routing/service";
import { setStickyRouteBinding } from "@/lib/routing/sticky";
import type { RouteDecision } from "@/lib/routing/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type AuthenticatedApiRequest = {
  apiKeyId: string;
  userId: string;
};

type SuccessfulChatResult =
  | {
      kind: "json";
      body: ChatCompletionResponse;
      status: number;
      requestLogId: string;
    }
  | {
      kind: "stream";
      body: ReadableStream<Uint8Array>;
      status: number;
      requestLogId: string;
    };

type ExecutionState = {
  route: RouteDecision;
  actualProvider: ProviderName;
  actualModel: string;
  fallbackUsed: boolean;
  fallbackFromProvider: ProviderName | null;
  fallbackFromModel: string | null;
  fallbackCursor: number;
};

function buildProviderInput(input: ChatCompletionRequestInput, model: string): ChatCompletionInput {
  return {
    model,
    messages: input.messages,
    temperature: input.temperature,
    top_p: input.top_p,
    max_tokens: input.max_tokens,
    stream: input.stream,
    stop: input.stop,
    tools: input.tools,
    tool_choice: input.tool_choice,
    response_format: input.response_format
  };
}

function toProviderUsageSnapshot(usage: ChatCompletionUsage | null | undefined): ProviderUsageSnapshot | null {
  if (!usage) {
    return null;
  }

  const promptTokens =
    typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null;
  const completionTokens =
    typeof usage.completion_tokens === "number" ? usage.completion_tokens : null;
  const totalTokens =
    typeof usage.total_tokens === "number" ? usage.total_tokens : null;
  const cachedTokens =
    typeof usage.prompt_tokens_details?.cached_tokens === "number"
      ? usage.prompt_tokens_details.cached_tokens
      : null;
  const promptCacheHitTokens = cachedTokens;
  const promptCacheMissTokens =
    promptTokens !== null && cachedTokens !== null
      ? Math.max(0, promptTokens - cachedTokens)
      : null;
  const reasoningTokens =
    typeof usage.completion_tokens_details?.reasoning_tokens === "number"
      ? usage.completion_tokens_details.reasoning_tokens
      : null;

  const hasKnownUsage =
    promptTokens !== null ||
    completionTokens !== null ||
    totalTokens !== null ||
    promptCacheHitTokens !== null ||
    promptCacheMissTokens !== null ||
    reasoningTokens !== null;

  if (!hasKnownUsage) {
    return null;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    promptCacheHitTokens,
    promptCacheMissTokens,
    reasoningTokens
  };
}

function createInitialExecutionState(route: RouteDecision): ExecutionState {
  return {
    route,
    actualProvider: route.selectedProvider,
    actualModel: route.selectedModel,
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    fallbackCursor: 0
  };
}

function toLoggedRouteReason(state: ExecutionState) {
  return state.fallbackUsed
    ? `${state.route.routeReason}:fallback_retryable_upstream`
    : state.route.routeReason;
}

async function executeJsonWithRouting(
  input: ChatCompletionRequestInput,
  state: ExecutionState
) {
  while (true) {
    try {
      const provider = await getChatProvider(state.actualProvider);

      return await provider.createChatCompletion(
        buildProviderInput(input, state.actualModel)
      );
    } catch (error) {
      const nextFallback = state.route.fallbackChain[state.fallbackCursor];

      if (!nextFallback || !isRetryableUpstreamError(error)) {
        throw error;
      }

      state.fallbackUsed = true;
      state.fallbackFromProvider = state.actualProvider;
      state.fallbackFromModel = state.actualModel;
      state.actualProvider = nextFallback.provider;
      state.actualModel = nextFallback.model;
      state.fallbackCursor += 1;
    }
  }
}

async function executeStreamWithRouting(
  input: ChatCompletionRequestInput,
  state: ExecutionState
) {
  while (true) {
    try {
      const provider = await getChatProvider(state.actualProvider);

      return await provider.streamChatCompletion(
        buildProviderInput(input, state.actualModel)
      );
    } catch (error) {
      const nextFallback = state.route.fallbackChain[state.fallbackCursor];

      if (!nextFallback || !isRetryableUpstreamError(error)) {
        throw error;
      }

      state.fallbackUsed = true;
      state.fallbackFromProvider = state.actualProvider;
      state.fallbackFromModel = state.actualModel;
      state.actualProvider = nextFallback.provider;
      state.actualModel = nextFallback.model;
      state.fallbackCursor += 1;
    }
  }
}

export async function executeChatCompletion(
  input: ChatCompletionRequestInput,
  auth: AuthenticatedApiRequest
): Promise<SuccessfulChatResult> {
  return input.stream ? executeStreamingChatCompletion(input, auth) : executeJsonChatCompletion(input, auth);
}

async function executeJsonChatCompletion(
  input: ChatCompletionRequestInput,
  auth: AuthenticatedApiRequest
): Promise<SuccessfulChatResult> {
  const startedAt = Date.now();
  let state: ExecutionState | null = null;

  try {
    state = createInitialExecutionState(await resolveChatRoute(input, { apiKeyId: auth.apiKeyId }));
    const completion = await executeJsonWithRouting(input, state);
    const actualUpstreamModel = completion.model ?? state.actualModel;

    if (input.route_policy && input.session_id) {
      await setStickyRouteBinding({
        apiKeyId: auth.apiKeyId,
        sessionId: input.session_id,
        routePolicy: input.route_policy,
        provider: state.actualProvider,
        model: actualUpstreamModel
      });
    }

    const requestLog = await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: state.actualProvider,
      upstreamModel: actualUpstreamModel,
      requestedModel: state.route.requestedModel,
      routePolicy: state.route.requestedRoutePolicy,
      fallbackUsed: state.fallbackUsed,
      fallbackFromProvider: state.fallbackFromProvider,
      fallbackFromModel: state.fallbackFromModel,
      routeReason: toLoggedRouteReason(state),
      requestType: RequestType.CHAT_COMPLETION,
      isStream: false,
      status: RequestLogStatus.SUCCESS,
      httpStatus: 200,
      promptTokens: completion.usage?.prompt_tokens ?? null,
      completionTokens: completion.usage?.completion_tokens ?? null,
      totalTokens: completion.usage?.total_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      errorCode: null,
      errorMessage: null
    });

    await markApiKeyAuthenticatedUsage(auth.apiKeyId);
    const usageSnapshot = toProviderUsageSnapshot(completion.usage);

    if (usageSnapshot) {
      await finalizeUsageCharge({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        requestLogId: requestLog.id,
        provider: state.actualProvider,
        requestedModel: state.route.requestedModel,
        upstreamModel: actualUpstreamModel,
        isStream: false,
        usage: usageSnapshot
      });
    } else {
      await markUsageLedgerState({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        requestLogId: requestLog.id,
        provider: state.actualProvider,
        requestedModel: state.route.requestedModel,
        upstreamModel: actualUpstreamModel,
        isStream: false,
        status: UsageLedgerStatus.UNBILLABLE,
        notes: "Non-stream response returned without billable usage metadata.",
        errorReason: "missing_usage"
      });
    }

    return {
      kind: "json",
      body: completion,
      status: 200,
      requestLogId: requestLog.id
    };
  } catch (error) {
    await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: state?.actualProvider ?? "platform",
      upstreamModel: state?.actualModel ?? null,
      requestedModel: state?.route.requestedModel ?? input.model ?? null,
      routePolicy: state?.route.requestedRoutePolicy ?? input.route_policy ?? null,
      fallbackUsed: state?.fallbackUsed ?? false,
      fallbackFromProvider: state?.fallbackFromProvider ?? null,
      fallbackFromModel: state?.fallbackFromModel ?? null,
      routeReason: state ? toLoggedRouteReason(state) : null,
      requestType: RequestType.CHAT_COMPLETION,
      isStream: false,
      status: RequestLogStatus.ERROR,
      httpStatus: error instanceof ApiRouteError ? error.status : 500,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof ApiRouteError ? error.code : "internal_error",
      errorMessage: sanitizeErrorMessage(error instanceof Error ? error.message : "Internal server error.")
    });

    if (error instanceof Error) {
      throw markErrorLogged(error);
    }

    throw error;
  }
}

async function executeStreamingChatCompletion(
  input: ChatCompletionRequestInput,
  auth: AuthenticatedApiRequest
): Promise<SuccessfulChatResult> {
  const startedAt = Date.now();
  let state: ExecutionState | null = null;

  try {
    state = createInitialExecutionState(await resolveChatRoute(input, { apiKeyId: auth.apiKeyId }));
    const providerResult = await executeStreamWithRouting(input, state);
    const actualUpstreamModel = providerResult.upstreamModel ?? state.actualModel;

    if (input.route_policy && input.session_id) {
      await setStickyRouteBinding({
        apiKeyId: auth.apiKeyId,
        sessionId: input.session_id,
        routePolicy: input.route_policy,
        provider: state.actualProvider,
        model: actualUpstreamModel
      });
    }

    const requestLog = await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: state.actualProvider,
      upstreamModel: actualUpstreamModel,
      requestedModel: state.route.requestedModel,
      routePolicy: state.route.requestedRoutePolicy,
      fallbackUsed: state.fallbackUsed,
      fallbackFromProvider: state.fallbackFromProvider,
      fallbackFromModel: state.fallbackFromModel,
      routeReason: toLoggedRouteReason(state),
      requestType: RequestType.CHAT_COMPLETION,
      isStream: true,
      status: RequestLogStatus.SUCCESS,
      httpStatus: providerResult.status,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      latencyMs: null,
      errorCode: null,
      errorMessage: null
    });

    await markApiKeyAuthenticatedUsage(auth.apiKeyId);

    let lineBuffer = "";
    let promptTokens: number | null = null;
    let completionTokens: number | null = null;
    let totalTokens: number | null = null;
    let promptCacheHitTokens: number | null = null;
    let promptCacheMissTokens: number | null = null;
    let reasoningTokens: number | null = null;

    const wrappedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = providerResult.stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const text = decoder.decode(value, { stream: true });
            lineBuffer += text;

            const completeLines = lineBuffer.split("\n");
            lineBuffer = completeLines.pop() ?? "";

            for (const line of completeLines) {
              if (!line.startsWith("data: ") || line === "data: [DONE]") {
                continue;
              }

              const payload = line.slice(6);

              try {
                const parsed = JSON.parse(payload) as {
                  usage?: ChatCompletionUsage | null;
                };

                const usageSnapshot = toProviderUsageSnapshot(parsed.usage);

                if (usageSnapshot) {
                  promptTokens = usageSnapshot.promptTokens ?? promptTokens;
                  completionTokens =
                    usageSnapshot.completionTokens ?? completionTokens;
                  totalTokens = usageSnapshot.totalTokens ?? totalTokens;
                  promptCacheHitTokens =
                    usageSnapshot.promptCacheHitTokens ?? promptCacheHitTokens;
                  promptCacheMissTokens =
                    usageSnapshot.promptCacheMissTokens ?? promptCacheMissTokens;
                  reasoningTokens =
                    usageSnapshot.reasoningTokens ?? reasoningTokens;
                }
              } catch {
                // Ignore parse failures for intermediate chunks; the client still receives the original stream.
              }
            }

            controller.enqueue(value);
          }

          await updateRequestLog(requestLog.id, {
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs: Date.now() - startedAt
          });

          const finalUsage: ProviderUsageSnapshot | null =
            promptTokens !== null ||
            completionTokens !== null ||
            totalTokens !== null ||
            promptCacheHitTokens !== null ||
            promptCacheMissTokens !== null ||
            reasoningTokens !== null
              ? {
                  promptTokens,
                  completionTokens,
                  totalTokens,
                  promptCacheHitTokens,
                  promptCacheMissTokens,
                  reasoningTokens
                }
              : null;

          if (finalUsage) {
            await finalizeUsageCharge({
              userId: auth.userId,
              apiKeyId: auth.apiKeyId,
              requestLogId: requestLog.id,
              provider: state!.actualProvider,
              requestedModel: state!.route.requestedModel,
              upstreamModel: actualUpstreamModel,
              isStream: true,
              usage: finalUsage
            });
          } else {
            await markUsageLedgerState({
              userId: auth.userId,
              apiKeyId: auth.apiKeyId,
              requestLogId: requestLog.id,
              provider: state!.actualProvider,
              requestedModel: state!.route.requestedModel,
              upstreamModel: actualUpstreamModel,
              isStream: true,
              status: UsageLedgerStatus.PENDING,
              notes: "Streaming completed without final usage metadata.",
              errorReason: "missing_final_usage"
            });
          }

          controller.close();
        } catch (error) {
          await updateRequestLog(requestLog.id, {
            status: RequestLogStatus.ERROR,
            httpStatus: error instanceof ApiRouteError ? error.status : 502,
            latencyMs: Date.now() - startedAt,
            errorCode: error instanceof ApiRouteError ? error.code : "upstream_stream_error",
            errorMessage: sanitizeErrorMessage(error instanceof Error ? error.message : "Streaming failed.")
          });

          await markUsageLedgerState({
            userId: auth.userId,
            apiKeyId: auth.apiKeyId,
            requestLogId: requestLog.id,
            provider: state!.actualProvider,
            requestedModel: state!.route.requestedModel,
            upstreamModel: actualUpstreamModel,
            isStream: true,
            status: UsageLedgerStatus.FAILED,
            notes: "Streaming terminated before billable finalization.",
            errorReason:
              error instanceof ApiRouteError ? error.code : "stream_failure"
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } finally {
          reader.releaseLock();
        }
      },
      async cancel() {
        providerResult.abort?.();
      }
    });

    return {
      kind: "stream",
      body: wrappedStream,
      status: providerResult.status,
      requestLogId: requestLog.id
    };
  } catch (error) {
    await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: state?.actualProvider ?? "platform",
      upstreamModel: state?.actualModel ?? null,
      requestedModel: state?.route.requestedModel ?? input.model ?? null,
      routePolicy: state?.route.requestedRoutePolicy ?? input.route_policy ?? null,
      fallbackUsed: state?.fallbackUsed ?? false,
      fallbackFromProvider: state?.fallbackFromProvider ?? null,
      fallbackFromModel: state?.fallbackFromModel ?? null,
      routeReason: state ? toLoggedRouteReason(state) : null,
      requestType: RequestType.CHAT_COMPLETION,
      isStream: true,
      status: RequestLogStatus.ERROR,
      httpStatus: error instanceof ApiRouteError ? error.status : 502,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof ApiRouteError ? error.code : "upstream_error",
      errorMessage: sanitizeErrorMessage(error instanceof Error ? error.message : "Streaming failed.")
    });

    if (error instanceof Error) {
      throw markErrorLogged(error);
    }

    throw error;
  }
}
