import { ApiKeyStatus, RequestLogStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { OnboardingState } from "@/lib/onboarding/types";

export function deriveOnboardingState({
  apiKeyCount,
  successfulRequestCount
}: {
  apiKeyCount: number;
  successfulRequestCount: number;
}): OnboardingState {
  const hasApiKey = apiKeyCount > 0;
  const hasSuccessfulRequest = successfulRequestCount > 0;

  return {
    milestone: !hasApiKey ? "no_api_key" : hasSuccessfulRequest ? "first_request_complete" : "api_key_created_no_successful_request",
    hasApiKey,
    hasSuccessfulRequest,
    apiKeyCount,
    successfulRequestCount
  };
}

export async function getOnboardingState(userId: string) {
  const [apiKeyCount, successfulRequestCount] = await Promise.all([
    db.apiKey.count({
      where: {
        userId,
        status: ApiKeyStatus.ACTIVE
      }
    }),
    db.requestLog.count({
      where: {
        userId,
        status: RequestLogStatus.SUCCESS
      }
    })
  ]);

  return deriveOnboardingState({
    apiKeyCount,
    successfulRequestCount
  });
}
