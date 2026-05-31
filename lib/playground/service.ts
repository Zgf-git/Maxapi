import { ApiKeyStatus, RequestLogStatus, RequestType } from "@prisma/client";

import { assertSufficientBalance } from "@/lib/balance/service";
import { ApiRouteError, sanitizeErrorMessage } from "@/lib/chat/errors";
import { executeChatCompletion } from "@/lib/chat/service";
import { parseChatCompletionRequest } from "@/lib/chat/validation";
import { db } from "@/lib/db";
import { assertChatEntitlement } from "@/lib/plans/entitlements";
import type { ChatCompletionResponse } from "@/lib/providers/types";
import { createRequestLog } from "@/lib/request-logs/repository";
import { recordAbuseEvent } from "@/lib/risk/events";
import { enforceRequestProtection, type ProtectionLease } from "@/lib/risk/protection";
import type { PlaygroundActionResult, PlaygroundPayload, PlaygroundRequestDetail } from "@/lib/playground/types";

function getAssistantText(response: ChatCompletionResponse) {
  return response.choices
    .map((choice) => choice.message.content)
    .filter((content): content is string => Boolean(content))
    .join("\n\n");
}

async function getRequestDetail(userId: string, requestLogId: string): Promise<PlaygroundRequestDetail | null> {
  const row = await db.requestLog.findFirst({
    where: {
      id: requestLogId,
      userId
    },
    include: {
      usageLedgerEntry: true
    }
  });

  if (!row) {
    return null;
  }

  return {
    requestLogId: row.id,
    createdAt: row.createdAt.toISOString(),
    requestedModel: row.requestedModel,
    requestedRoutePolicy: row.routePolicy,
    actualProvider: row.provider,
    actualUpstreamModel: row.upstreamModel,
    fallbackUsed: row.fallbackUsed,
    fallbackFromProvider: row.fallbackFromProvider,
    fallbackFromModel: row.fallbackFromModel,
    routeReason: row.routeReason,
    status: row.status,
    latencyMs: row.latencyMs,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    totalTokens: row.totalTokens,
    totalCostUsdMicros: row.usageLedgerEntry?.totalCostUsdMicros?.toString() ?? null,
    ledgerStatus: row.usageLedgerEntry?.status ?? null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage
  };
}

async function getLatestErroredDetail(userId: string, apiKeyId: string, startedAt: Date) {
  const row = await db.requestLog.findFirst({
    where: {
      userId,
      apiKeyId,
      createdAt: {
        gte: startedAt
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return row ? getRequestDetail(userId, row.id) : null;
}

function getRequestedIntent(payload: PlaygroundPayload) {
  return {
    requestedModel: typeof payload.model === "string" ? payload.model : null,
    requestedRoutePolicy: typeof payload.route_policy === "string" ? payload.route_policy : null,
    isStream: payload.stream === true
  };
}

async function createPlaygroundFailureLog({
  apiKeyId,
  userId,
  payload,
  startedAt,
  status,
  code,
  message
}: {
  apiKeyId: string;
  userId: string;
  payload: PlaygroundPayload;
  startedAt: Date;
  status: number;
  code: string;
  message: string;
}) {
  const intent = getRequestedIntent(payload);

  return createRequestLog({
    apiKeyId,
    userId,
    provider: "platform",
    upstreamModel: null,
    requestedModel: intent.requestedModel,
    routePolicy: intent.requestedRoutePolicy,
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    routeReason: "dashboard_playground_pre_execution",
    requestType: RequestType.CHAT_COMPLETION,
    isStream: intent.isStream,
    status: RequestLogStatus.ERROR,
    httpStatus: status,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    latencyMs: Date.now() - startedAt.getTime(),
    errorCode: code,
    errorMessage: sanitizeErrorMessage(message)
  });
}

export async function executePlaygroundRequest(
  userId: string,
  payload: PlaygroundPayload,
  ipAddress?: string | null
): Promise<PlaygroundActionResult> {
  const startedAt = new Date();
  let lease: ProtectionLease | null = null;

  const apiKey = await db.apiKey.findFirst({
    where: {
      userId,
      status: ApiKeyStatus.ACTIVE
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true
    }
  });

  if (!apiKey) {
    return {
      ok: false,
      status: 400,
      code: "no_active_api_key",
      message: "Create an active API key before running playground requests."
    };
  }

  try {
    const input = parseChatCompletionRequest(payload);

    if (input.stream) {
      throw new ApiRouteError(
        400,
        "playground_streaming_not_supported",
        "Dashboard playground streaming playback is not available yet. Use the API directly for streaming tests."
      );
    }

    const entitlement = await assertChatEntitlement(userId, {
      model: input.model ?? null,
      route_policy: input.route_policy ?? null
    });

    lease = await enforceRequestProtection({
      userId,
      apiKeyId: apiKey.id,
      plan: entitlement.plan,
      ipAddress,
      requestedModel: input.model ?? null,
      routePolicy: input.route_policy ?? null,
      isStream: false
    });

    await assertSufficientBalance(userId);

    const result = await executeChatCompletion(input, {
      userId,
      apiKeyId: apiKey.id
    });

    await lease.release();
    lease = null;

    if (result.kind !== "json") {
      throw new ApiRouteError(500, "internal_error", "Unexpected streaming response in playground execution.");
    }

    const detail = await getRequestDetail(userId, result.requestLogId);

    if (!detail) {
      throw new ApiRouteError(500, "internal_error", "Playground request completed but its request log could not be loaded.");
    }

    return {
      ok: true,
      requestPayload: input,
      responsePayload: result.body,
      assistantText: getAssistantText(result.body),
      detail
    };
  } catch (error) {
    if (lease) {
      await lease.release();
      lease = null;
    }

    const status = error instanceof ApiRouteError ? error.status : 500;
    const code = error instanceof ApiRouteError ? error.code : "internal_error";
    const message =
      error instanceof ApiRouteError
        ? error.message
        : "The playground could not complete this request.";
    const sanitizedMessage = sanitizeErrorMessage(message) ?? "The playground could not complete this request.";
    const intent = getRequestedIntent(payload);
    let detail = await getLatestErroredDetail(userId, apiKey.id, startedAt);

    if (!detail) {
      const log = await createPlaygroundFailureLog({
        apiKeyId: apiKey.id,
        userId,
        payload,
        startedAt,
        status,
        code,
        message: sanitizedMessage
      });
      detail = await getRequestDetail(userId, log.id);
    }

    if (code === "insufficient_balance") {
      await recordAbuseEvent({
        userId,
        apiKeyId: apiKey.id,
        ipAddress,
        eventType: "balance_hammer",
        severity: "warning",
        status: "blocked",
        reasonCode: "insufficient_balance",
        routePolicy: intent.requestedRoutePolicy,
        requestedModel: intent.requestedModel
      });
    }

    return {
      ok: false,
      status,
      code,
      message: sanitizedMessage,
      requestPayload: payload,
      detail
    };
  }
}
