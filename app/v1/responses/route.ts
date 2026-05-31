import { RequestLogStatus, RequestType } from "@prisma/client";
import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-auth";
import { assertSufficientBalance } from "@/lib/balance/service";
import { assertEstimatedChatRequestBudget } from "@/lib/billing/preflight";
import { ApiRouteError, sanitizeErrorMessage } from "@/lib/chat/errors";
import { jsonError } from "@/lib/chat/response";
import { executeChatCompletion } from "@/lib/chat/service";
import { assertChatEntitlement } from "@/lib/plans/entitlements";
import { createRequestLog } from "@/lib/request-logs/repository";
import { toResponsesApiResponse } from "@/lib/responses/response";
import { parseResponsesRequest } from "@/lib/responses/validation";
import { enforceRequestProtection, type ProtectionLease } from "@/lib/risk/protection";

export const dynamic = "force-dynamic";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestedModel: string | null = null;
  let requestedRoutePolicy: string | null = null;
  let authContext: { apiKeyId: string; userId: string } | null = null;
  let protectionLease: ProtectionLease | null = null;
  const clientIp = getClientIp(request);

  try {
    const rawBody = await request.text();

    if (!rawBody) {
      throw new ApiRouteError(400, "invalid_request", "Request body is required.");
    }

    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new ApiRouteError(400, "invalid_request", "Request body must be valid JSON.");
    }

    const auth = await authenticateApiKey(
      request.headers.get("authorization"),
      request.headers.get("x-api-key")
    );

    if (!auth.ok) {
      return jsonError(auth.status, auth.code, auth.message);
    }

    authContext = {
      apiKeyId: auth.apiKeyId,
      userId: auth.userId
    };

    const input = parseResponsesRequest(parsedBody);
    requestedModel = input.model ?? null;
    requestedRoutePolicy = input.route_policy ?? null;
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
      isStream: false
    });

    await assertSufficientBalance(auth.userId);
    await assertEstimatedChatRequestBudget(auth.userId, input);

    const result = await executeChatCompletion(input, authContext);
    await protectionLease.release();
    protectionLease = null;

    if (result.kind === "stream") {
      throw new ApiRouteError(500, "internal_error", "Responses compatibility unexpectedly returned a stream.");
    }

    return NextResponse.json(toResponsesApiResponse(result.body), { status: result.status });
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
        isStream: false,
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

    return jsonError(status, code, message);
  }
}
