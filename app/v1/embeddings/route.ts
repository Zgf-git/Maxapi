import { RequestLogStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-auth";
import { assertSufficientBalance } from "@/lib/balance/service";
import { assertEstimatedEmbeddingRequestBudget } from "@/lib/billing/preflight";
import { ApiRouteError, sanitizeErrorMessage } from "@/lib/chat/errors";
import { jsonError } from "@/lib/chat/response";
import { executeEmbedding } from "@/lib/embeddings/service";
import { parseEmbeddingsRequest } from "@/lib/embeddings/validation";
import { assertChatEntitlement } from "@/lib/plans/entitlements";
import { createRequestLog } from "@/lib/request-logs/repository";
import { enforceRequestProtection, type ProtectionLease } from "@/lib/risk/protection";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestedModel: string | null = null;
  let authContext: { apiKeyId: string; userId: string } | null = null;
  let protectionLease: ProtectionLease | null = null;

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      throw new ApiRouteError(400, "invalid_request", "Request body is required.");
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ApiRouteError(400, "invalid_request", "Request body must be valid JSON.");
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
        routePolicy: null,
        fallbackUsed: false,
        fallbackFromProvider: null,
        fallbackFromModel: null,
        routeReason: null,
        requestType: "EMBEDDING",
        isStream: false,
        status: RequestLogStatus.ERROR,
        httpStatus: auth.status,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        latencyMs: Date.now() - startedAt,
        errorCode: auth.code,
        errorMessage: sanitizeErrorMessage(auth.message)
      });

      return jsonError(auth.status, auth.code, auth.message);
    }

    authContext = {
      apiKeyId: auth.apiKeyId,
      userId: auth.userId
    };

    const input = parseEmbeddingsRequest(payload);
    requestedModel = input.model;

    await assertChatEntitlement(auth.userId, {
      model: input.model,
      route_policy: null
    });
    protectionLease = await enforceRequestProtection({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      requestedModel: input.model,
      routePolicy: null,
      requestBodyChars: rawBody.length,
      isStream: false
    });
    await assertSufficientBalance(auth.userId);
    await assertEstimatedEmbeddingRequestBudget(auth.userId, input);

    const result = await executeEmbedding(input, authContext);
    await protectionLease.release();
    protectionLease = null;

    return NextResponse.json(result, { status: 200 });
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
        routePolicy: null,
        fallbackUsed: false,
        fallbackFromProvider: null,
        fallbackFromModel: null,
        routeReason: null,
        requestType: "EMBEDDING",
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
