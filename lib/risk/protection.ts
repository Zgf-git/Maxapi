import { randomUUID } from "crypto";

import { ApiKeyStatus, PlanTier, Prisma, RiskState } from "@prisma/client";

import { ApiRouteError } from "@/lib/chat/errors";
import { getCatalogExplicitModels } from "@/lib/catalog";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPlanRateLimits } from "@/lib/plans/rate-limits";
import { hashIpAddress, recordAbuseEvent } from "@/lib/risk/events";

const RATE_WINDOW_MS = 60 * 1000;
const CONCURRENCY_TTL_MS = 5 * 60 * 1000;
const HIGH_WEIGHT_MODELS = new Set(
  getCatalogExplicitModels()
    .filter((entry) => entry.id.endsWith("-pro") || entry.id === "claude-sonnet-4.5")
    .map((entry) => entry.id)
);

export type ProtectionContext = {
  userId: string;
  apiKeyId: string;
  plan?: PlanTier | null;
  ipAddress?: string | null;
  requestedModel?: string | null;
  routePolicy?: string | null;
  requestBodyChars?: number | null;
  isStream: boolean;
};

export type ProtectionLease = {
  holderId: string;
  release: () => Promise<void>;
};

type RateLimitRule = {
  scope: string;
  limit: number;
  weight: number;
  reasonCode: string;
};

type ApiKeyProtectionRecord = {
  riskState: RiskState;
  status: ApiKeyStatus;
  isEnabled: boolean;
  expiresAt: Date | null;
  requestsPerMinuteLimit: number | null;
  concurrentRequestsLimit: number | null;
  dailyRequestLimit: number | null;
};

type EffectiveLimits = {
  apiKeyPerMinute: number;
  userPerMinute: number;
  ipPerMinute: number;
  concurrentApiKey: number;
  concurrentUser: number;
  dailyApiKeyRequests: number | null;
};

type LockingClient = Prisma.TransactionClient;

async function lockScope(client: LockingClient, scope: string) {
  await client.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", scope);
}

function requestWeight(context: ProtectionContext) {
  let weight = 1;

  if (context.isStream) {
    weight += 1;
  }

  if (context.routePolicy === "premium" || (context.requestedModel && HIGH_WEIGHT_MODELS.has(context.requestedModel))) {
    weight += 1;
  }

  return weight;
}

function ipScope(ipAddress: string | null | undefined) {
  const ipHash = hashIpAddress(ipAddress);

  return ipHash ? `ip:${ipHash}` : null;
}

async function checkRiskState(context: ProtectionContext) {
  const [user, rawApiKey] = await Promise.all([
    db.user.findUnique({
      where: { id: context.userId },
      select: { riskState: true, plan: true, createdAt: true }
    }),
    (db.apiKey as any).findUnique({
      where: { id: context.apiKeyId },
      select: {
        riskState: true,
        status: true,
        isEnabled: true,
        expiresAt: true,
        requestsPerMinuteLimit: true,
        concurrentRequestsLimit: true,
        dailyRequestLimit: true
      }
    }) as Promise<ApiKeyProtectionRecord | null>
  ]);
  const apiKey = rawApiKey as ApiKeyProtectionRecord | null;

  if (!user || !apiKey || apiKey.status !== ApiKeyStatus.ACTIVE) {
    throw new ApiRouteError(401, "invalid_api_key", "Invalid API key.");
  }

  if (apiKey.isEnabled === false || (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now())) {
    throw new ApiRouteError(403, "api_key_suspended", "This API key is disabled.");
  }

  if (user.riskState === RiskState.SUSPENDED || user.riskState === RiskState.RESTRICTED) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "risk_state_block",
      severity: "critical",
      status: "blocked",
      reasonCode: "account_restricted",
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel
    });

    throw new ApiRouteError(403, "account_restricted", "This account is restricted.");
  }

  if (apiKey.riskState === RiskState.SUSPENDED || apiKey.riskState === RiskState.RESTRICTED) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "risk_state_block",
      severity: "critical",
      status: "blocked",
      reasonCode: "api_key_suspended",
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel
    });

    throw new ApiRouteError(403, "api_key_suspended", "This API key is suspended.");
  }

  return {
    plan: context.plan ?? user.plan,
    apiKey,
    userCreatedAt: user.createdAt
  };
}

async function enforceRequestSizePolicy(context: ProtectionContext, userCreatedAt: Date) {
  const requestBodyChars = context.requestBodyChars ?? 0;

  if (requestBodyChars > env.RISK_MAX_REQUEST_BODY_CHARS) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "request_size_block",
      severity: "warning",
      status: "blocked",
      reasonCode: "request_body_too_large",
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel,
      metadata: {
        requestBodyChars,
        maxAllowedChars: env.RISK_MAX_REQUEST_BODY_CHARS
      }
    });

    throw new ApiRouteError(413, "request_too_large", "Request body exceeds the maximum allowed size.");
  }

  const accountAgeMs = Date.now() - userCreatedAt.getTime();
  const newUserWindowMs = env.RISK_NEW_USER_AGE_HOURS * 60 * 60 * 1000;

  if (accountAgeMs <= newUserWindowMs && requestBodyChars > env.RISK_NEW_USER_MAX_REQUEST_BODY_CHARS) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "request_size_block",
      severity: "warning",
      status: "blocked",
      reasonCode: "new_user_large_context_block",
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel,
      metadata: {
        requestBodyChars,
        maxAllowedChars: env.RISK_NEW_USER_MAX_REQUEST_BODY_CHARS,
        accountAgeHours: Math.floor(accountAgeMs / (60 * 60 * 1000))
      }
    });

    throw new ApiRouteError(403, "new_user_context_limit", "Large request bodies are temporarily restricted for new accounts.");
  }
}

function resolveEffectiveLimits(
  plan: PlanTier | null | undefined,
  apiKey: ApiKeyProtectionRecord,
  base: {
    apiKeyPerMinute: number;
    userPerMinute: number;
    ipPerMinute: number;
    concurrentApiKey: number;
    concurrentUser: number;
  }
): EffectiveLimits {
  const planLimits = getPlanRateLimits(plan, base);

  return {
    ...planLimits,
    apiKeyPerMinute: apiKey.requestsPerMinuteLimit ?? planLimits.apiKeyPerMinute,
    concurrentApiKey: apiKey.concurrentRequestsLimit ?? planLimits.concurrentApiKey,
    dailyApiKeyRequests: apiKey.dailyRequestLimit ?? null
  };
}

async function applyRateLimit(rule: RateLimitRule, context: ProtectionContext) {
  const counter = await db.$transaction(async (tx) => {
    await lockScope(tx, `rate:${rule.scope}`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RATE_WINDOW_MS);
    const existing = await tx.rateLimitCounter.findUnique({
      where: { key: rule.scope }
    });

    if (!existing) {
      return tx.rateLimitCounter.create({
        data: {
          key: rule.scope,
          count: rule.weight,
          windowStart: now,
          expiresAt
        }
      });
    }

    if (existing.expiresAt <= now) {
      return tx.rateLimitCounter.update({
        where: { key: rule.scope },
        data: {
          count: rule.weight,
          windowStart: now,
          expiresAt
        }
      });
    }

    return tx.rateLimitCounter.update({
      where: { key: rule.scope },
      data: {
        count: {
          increment: rule.weight
        }
      }
    });
  });

  if (counter.count > rule.limit) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "rate_limit_hit",
      severity: "warning",
      status: "blocked",
      reasonCode: rule.reasonCode,
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel,
      metadata: {
        scope: rule.scope.split(":")[0],
        limit: rule.limit,
        count: counter.count,
        weight: rule.weight
      }
    });

    throw new ApiRouteError(429, "rate_limited", "Rate limit exceeded. Please retry later.");
  }
}

async function acquireConcurrencyLease(
  context: ProtectionContext,
  limits: EffectiveLimits
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONCURRENCY_TTL_MS);
  const holderId = randomUUID();
  const scopes = [
    {
      scope: `apiKey:${context.apiKeyId}`,
      limit: limits.concurrentApiKey,
      reasonCode: "api_key_concurrent_limit"
    },
    {
      scope: `user:${context.userId}`,
      limit: limits.concurrentUser,
      reasonCode: "user_concurrent_limit"
    }
  ];

  const blockedScope = await db.$transaction(async (tx) => {
    await tx.concurrencyLease.deleteMany({
      where: {
        expiresAt: {
          lte: now
        }
      }
    });

    for (const scope of scopes.slice().sort((a, b) => a.scope.localeCompare(b.scope))) {
      await lockScope(tx, `concurrency:${scope.scope}`);
    }

    for (const scope of scopes) {
      const activeCount = await tx.concurrencyLease.count({
        where: {
          scope: scope.scope,
          expiresAt: {
            gt: now
          }
        }
      });

      if (activeCount >= scope.limit) {
        return {
          ...scope,
          activeCount
        };
      }
    }

    await tx.concurrencyLease.createMany({
      data: scopes.map((scope) => ({
        holderId,
        scope: scope.scope,
        expiresAt
      }))
    });

    return null;
  });

  if (blockedScope) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "concurrent_limit_hit",
      severity: "warning",
      status: "blocked",
      reasonCode: blockedScope.reasonCode,
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel,
      metadata: {
        scope: blockedScope.scope.split(":")[0],
        limit: blockedScope.limit,
        activeCount: blockedScope.activeCount
      }
    });

    throw new ApiRouteError(429, "concurrent_limit_exceeded", "Too many concurrent requests. Please retry later.");
  }

  return {
    holderId,
    release: async () => {
      await db.concurrencyLease.deleteMany({
        where: { holderId }
      });
    }
  };
}

async function applyDailyApiKeyLimit(context: ProtectionContext, limit: number) {
  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const apiKey = await db.$transaction(async (tx) => {
    await lockScope(tx, `daily:apiKey:${context.apiKeyId}`);

    const existing = await (tx.apiKey as any).findUnique({
      where: { id: context.apiKeyId },
      select: {
        id: true,
        dailyRequestCount: true,
        dailyRequestWindowStart: true
      }
    }) as { id: string; dailyRequestCount: number; dailyRequestWindowStart: Date | null } | null;

    if (!existing) {
      return null;
    }

    const shouldReset =
      !existing.dailyRequestWindowStart ||
      existing.dailyRequestWindowStart.getTime() !== windowStart.getTime();

    return (tx.apiKey as any).update({
      where: { id: context.apiKeyId },
      data: shouldReset
        ? {
            dailyRequestCount: 1,
            dailyRequestWindowStart: windowStart
          }
        : {
            dailyRequestCount: {
              increment: 1
            }
          },
      select: {
        dailyRequestCount: true
      }
    }) as Promise<{ dailyRequestCount: number }>;
  });

  if (!apiKey) {
    throw new ApiRouteError(401, "invalid_api_key", "Invalid API key.");
  }

  if (apiKey.dailyRequestCount > limit) {
    await recordAbuseEvent({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress,
      eventType: "rate_limit_hit",
      severity: "warning",
      status: "blocked",
      reasonCode: "api_key_daily_limit",
      routePolicy: context.routePolicy,
      requestedModel: context.requestedModel,
      metadata: {
        scope: "apiKeyDaily",
        limit,
        count: apiKey.dailyRequestCount
      }
    });

    throw new ApiRouteError(429, "rate_limited", "Daily request limit exceeded.");
  }
}

export async function enforceRequestProtection(context: ProtectionContext): Promise<ProtectionLease> {
  const { plan, apiKey, userCreatedAt } = await checkRiskState(context);
  await enforceRequestSizePolicy(context, userCreatedAt);
  const limits = resolveEffectiveLimits(plan, apiKey, {
    apiKeyPerMinute: env.RATE_LIMIT_API_KEY_PER_MINUTE,
    userPerMinute: env.RATE_LIMIT_USER_PER_MINUTE,
    ipPerMinute: env.RATE_LIMIT_IP_PER_MINUTE,
    concurrentApiKey: env.CONCURRENT_API_KEY_LIMIT,
    concurrentUser: env.CONCURRENT_USER_LIMIT
  });

  const weight = requestWeight(context);
  const rules: RateLimitRule[] = [
    {
      scope: `apiKey:${context.apiKeyId}:minute`,
      limit: limits.apiKeyPerMinute,
      weight,
      reasonCode: "api_key_rate_limit"
    },
    {
      scope: `user:${context.userId}:minute`,
      limit: limits.userPerMinute,
      weight,
      reasonCode: "user_rate_limit"
    }
  ];
  const ip = ipScope(context.ipAddress);

  if (ip) {
    rules.push({
      scope: `${ip}:minute`,
      limit: limits.ipPerMinute,
      weight,
      reasonCode: "ip_rate_limit"
    });
  }

  if (limits.dailyApiKeyRequests) {
    await applyDailyApiKeyLimit(context, limits.dailyApiKeyRequests);
  }

  for (const rule of rules) {
    await applyRateLimit(rule, context);
  }

  return acquireConcurrencyLease(context, limits);
}
