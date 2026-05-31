import { RequestLogStatus, UsageLedgerStatus } from "@prisma/client";

import { markApiKeyAuthenticatedUsage } from "@/lib/api-auth";
import { finalizeUsageCharge, markUsageLedgerState } from "@/lib/billing/ledger";
import { ApiRouteError, markErrorLogged, sanitizeErrorMessage } from "@/lib/chat/errors";
import { getProviderForCapability } from "@/lib/providers/registry";
import type { ProviderName, RerankRequestInput } from "@/lib/providers/types";
import { createRequestLog } from "@/lib/request-logs/repository";
import { getProviderForModel } from "@/lib/routing/config";

type AuthenticatedApiRequest = {
  apiKeyId: string;
  userId: string;
};

function estimateRerankTokens(input: RerankRequestInput) {
  const chars = input.query.length + input.documents.reduce((sum, doc) => sum + doc.length, 0);

  return Math.max(1, Math.ceil(chars / 4));
}

export async function executeRerank(input: RerankRequestInput, auth: AuthenticatedApiRequest) {
  const startedAt = Date.now();
  const providerName = getProviderForModel(input.model) as ProviderName | null;

  if (!providerName) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${input.model}.`, "unsupported_model");
  }

  try {
    const provider = await getProviderForCapability(providerName, "rerank").catch((error) => {
      throw new ApiRouteError(400, "unsupported_model", error instanceof Error ? error.message : "Rerank provider is unavailable.");
    });
    const result = await provider.createRerank(input);
    const totalTokens = result.usage?.total_tokens ?? estimateRerankTokens(input);
    const requestLog = await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: providerName,
      upstreamModel: result.model ?? input.model,
      requestedModel: input.model,
      routePolicy: null,
      fallbackUsed: false,
      fallbackFromProvider: null,
      fallbackFromModel: null,
      routeReason: "explicit_model",
      requestType: "RERANK",
      isStream: false,
      status: RequestLogStatus.SUCCESS,
      httpStatus: 200,
      promptTokens: totalTokens,
      completionTokens: 0,
      totalTokens,
      latencyMs: Date.now() - startedAt,
      errorCode: null,
      errorMessage: null
    });

    await markApiKeyAuthenticatedUsage(auth.apiKeyId);

    if (totalTokens > 0) {
      await finalizeUsageCharge({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        requestLogId: requestLog.id,
        provider: providerName,
        requestedModel: input.model,
        upstreamModel: result.model ?? input.model,
        isStream: false,
        usage: {
          promptTokens: totalTokens,
          completionTokens: 0,
          totalTokens,
          promptCacheHitTokens: null,
          promptCacheMissTokens: null,
          reasoningTokens: null
        }
      });
    } else {
      await markUsageLedgerState({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        requestLogId: requestLog.id,
        provider: providerName,
        requestedModel: input.model,
        upstreamModel: result.model ?? input.model,
        isStream: false,
        status: UsageLedgerStatus.UNBILLABLE,
        notes: "Rerank response returned without usage metadata.",
        errorReason: "missing_usage"
      });
    }

    return result;
  } catch (error) {
    await createRequestLog({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      provider: providerName ?? "platform",
      upstreamModel: input.model,
      requestedModel: input.model,
      routePolicy: null,
      fallbackUsed: false,
      fallbackFromProvider: null,
      fallbackFromModel: null,
      routeReason: "explicit_model",
      requestType: "RERANK",
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
