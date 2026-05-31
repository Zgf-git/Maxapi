import { PlanTier } from "@prisma/client";

import { getPlanCatalogEntry } from "@/lib/plans/catalog";

export type BaseRateLimitConfig = {
  apiKeyPerMinute: number;
  userPerMinute: number;
  ipPerMinute: number;
  concurrentApiKey: number;
  concurrentUser: number;
};

function scaleLimit(baseLimit: number, multiplier: number) {
  return Math.max(1, Math.floor(baseLimit * multiplier));
}

export function getPlanRateLimits(plan: PlanTier | null | undefined, base: BaseRateLimitConfig) {
  const profile = getPlanCatalogEntry(plan).rateLimitProfile;

  return {
    apiKeyPerMinute: scaleLimit(base.apiKeyPerMinute, profile.requestMultiplier),
    userPerMinute: scaleLimit(base.userPerMinute, profile.requestMultiplier),
    ipPerMinute: base.ipPerMinute,
    concurrentApiKey: scaleLimit(base.concurrentApiKey, profile.concurrencyMultiplier),
    concurrentUser: scaleLimit(base.concurrentUser, profile.concurrencyMultiplier)
  };
}
