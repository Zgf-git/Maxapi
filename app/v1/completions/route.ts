import { RequestLogStatus, RequestType } from "@prisma/client";
import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-auth";
import { assertSufficientBalance } from "@/lib/balance/service";
import { assertEstimatedChatRequestBudget } from "@/lib/billing/preflight";
import { ApiRouteError, sanitizeErrorMessage } from "@/lib/chat/errors";
import { jsonError } from "@/lib/chat/response";
import { executeChatCompletion } from "@/lib/chat/service";
import { toCompletionResponse, toCompletionStream } from "@/lib/completions/response";
import { parseCompletionRequest } from "@/lib/completions/validation";
import { assertChatEntitlement } from "@/lib/plans/entitlements";
import { createRequestLog } from "@/lib/request-logs/repository";
import { recordAbuseEvent } from "@/lib/risk/events";
import { enforceRequestProtection, type ProtectionLease } from "@/lib/risk/protection";

export const dynamic = "force-dynamic";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

function releaseLeaseOnStreamClose(body: ReadableStream<Uint8Array>, lease: ProtectionLease) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
        await lease.release();
        controller.close();
      }
    },
    async cancel() {
      await body.cancel().catch(() => undefined);
      await lease.release();
    }
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let parsedBody: unknown = null;
  let requestedModel: string | null = null;
  let requestedRoutePolicy: string | null = null;
  let isStream = false;
  let authContext: { apiKeyId: string; userId: string } | null = null;
  let protectionLease: ProtectionLease | null = null;
  const clientIp = getClientIp(request);

  try {
    const rawBody = await request.text();

    if (!rawBody) {
      throw new ApiRouteError(400, "invalid_request", "Request body is required.");
    }

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new ApiRouteError(400, "invalid_request", "Request body must be valid JSON.");
    }

    if (parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)) {
      requestedModel = "model" in parsedBody && typeof parsedBody.model === "string" ? parsedBody.model : null;
      requestedRoutePolicy =
        "route_policy" in parsedBody && typeof parsedBody.route_policy === "string"
          ? parsedBody.route_policy
          : null;
      isStream = "stream" in parsedBody && typeof parsedBody.stream === "boolean" ? parsedBody.stream : false;
    }

    const auth = await authenticateApiKey(
      request.headers.get("authorization"),
      request.headers.get("x-api-key")
    );

    if (!auth.ok) {
      await createRequestLog({
        apiKeyId: auth.apiKeyId ?? null,
        userId: auth.userId ?? null,
        provider: "platform",
        upstreamModel: null,
        requestedModel,
        routePolicy: requestedRoutePolicy,
        fallbackUsed: false,
        fallbackFromProvider: null,
        fallbackFromModel: null,
        routeReason: null,
        requestType: RequestType.CHAT_COMPLETION,
        isStream,
        status: RequestLogStatus.ERROR,
        httpStatus: auth.status,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        latencyMs: Date.now() - startedAt,
        errorCode: auth.code,
        errorMessage: sanitizeErrorMessage(auth.message)
      });
      await recordAbuseEvent({
        userId: auth.userId ?? null,
        apiKeyId: auth.apiKeyId ?? null,
        ipAddress: clientIp,
        eventType: "auth_failure",
        severity: auth.code === "revoked_api_key" ? "warning" : "info",
        status: "blocked",
        reasonCode: auth.code,
        routePolicy: requestedRoutePolicy,
        requestedModel
      });

      return jsonError(auth.status, auth.code, auth.message);
    }

    authContext = {
      apiKeyId: auth.apiKeyId,
      userId: auth.userId
    };

    const input = parseCompletionRequest(parsedBody);
    requestedModel = input.model ?? null;
    requestedRoutePolicy = input.route_policy ?? null;
    isStream = input.stream ?? false;
    const entitlement = await assertChatEntitlement(auth.userId, {
      model: input.model ?? null,
      route_policy: input.route_policy ?? null
    });

    protectionLease = await enforceRequestProtection({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      plan: entitlement.plan,
      ipAddress: clientIp,
      requestedModel,
      routePolicy: requestedRoutePolicy,
      requestBodyChars: rawBody.length,
      isStream
    });

    await assertSufficientBalance(auth.userId);
    await assertEstimatedChatRequestBudget(auth.userId, input);

    const result = await executeChatCompletion(input, authContext);

    if (result.kind === "stream") {
      const streamLease = protectionLease;
      protectionLease = null;

      return new Response(releaseLeaseOnStreamClose(toCompletionStream(result.body), streamLease), {
        status: result.status,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive"
        }
      });
    }

    await protectionLease.release();
    protectionLease = null;

    return NextResponse.json(toCompletionResponse(result.body), { status: result.status });
  } catch (error) {
    if (protectionLease) {
      await protectionLease.release();
      protectionLease = null;
    }

    const status = error instanceof ApiRouteError ? error.status : 500;
    const code = error instanceof ApiRouteError ? error.code : "internal_error";
    const message =
      error instanceof ApiRouteError ? error.message : "The server could not complete this request.";

    if (!(error instanceof Error && "logged" in error && error.logged)) {
      await createRequestLog({
        apiKeyId: authContext?.apiKeyId ?? null,
        userId: authContext?.userId ?? null,
        provider: "platform",
        upstreamModel: null,
        requestedModel,
        routePolicy: requestedRoutePolicy,
        fallbackUsed: false,
        fallbackFromProvider: null,
        fallbackFromModel: null,
        routeReason: null,
        requestType: RequestType.CHAT_COMPLETION,
        isStream,
        status: RequestLogStatus.ERROR,
        httpStatus: status,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        latencyMs: Date.now() - startedAt,
        errorCode: code,
        errorMessage: sanitizeErrorMessage(message)
      });
    }

    if (authContext && code === "insufficient_balance") {
      await recordAbuseEvent({
        userId: authContext.userId,
        apiKeyId: authContext.apiKeyId,
        ipAddress: clientIp,
        eventType: "balance_hammer",
        severity: "warning",
        status: "blocked",
        reasonCode: "insufficient_balance",
        routePolicy: requestedRoutePolicy,
        requestedModel
      });
    }

    return jsonError(status, code, message);
  }
}
