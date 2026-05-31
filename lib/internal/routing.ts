import { RoutePolicyConfigStatus, UpstreamKeyStatus, type ProviderStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { listProviderDefinitions } from "@/lib/providers/catalog";
import { listRoutePolicyConfigs } from "@/lib/routing/runtime";
import type { ProviderName, RoutePolicy } from "@/lib/providers/types";

/* ── Providers & upstream keys ─────────────────────────────────── */

export async function listRoutingProviders() {
  const definitions = listProviderDefinitions();

  const providers = await db.provider.findMany({
    orderBy: { slug: "asc" },
    include: {
      upstreamKeys: {
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
      }
    }
  });

  return providers.map((p) => {
    const def = definitions.find((d) => d.slug === p.slug);
    return {
      id: p.id,
      slug: p.slug as ProviderName,
      label: p.label,
      baseUrl: p.baseUrl,
      testModel: p.testModel,
      supportsChat: p.supportsChat,
      supportsEmbeddings: p.supportsEmbeddings,
      supportsRerank: (p as typeof p & { supportsRerank?: boolean }).supportsRerank ?? false,
      status: p.status,
      upstreamKeys: p.upstreamKeys.map((k) => ({
        id: k.id,
        displayName: k.displayName,
        keyPrefix: k.keyPrefix,
        lastFour: k.lastFour,
        priority: k.priority,
        status: k.status,
        baseUrlOverride: k.baseUrlOverride,
        quotaLimitUsdMicros: k.quotaLimitUsdMicros,
        quotaUsedUsdMicros: k.quotaUsedUsdMicros,
        dailyLimitRequests: k.dailyLimitRequests,
        dailyUsedRequests: k.dailyUsedRequests,
        errorCount: k.errorCount,
        lastTestedAt: k.lastTestedAt,
        lastErrorAt: k.lastErrorAt,
        lastErrorMessage: k.lastErrorMessage
      }))
    };
  });
}

export async function toggleUpstreamKeyStatus(keyId: string) {
  const key = await db.upstreamApiKey.findUnique({
    where: { id: keyId },
    select: { status: true }
  });

  if (!key) throw new Error("Key not found");

  const next = key.status === UpstreamKeyStatus.ACTIVE ? UpstreamKeyStatus.DISABLED : UpstreamKeyStatus.ACTIVE;

  return db.upstreamApiKey.update({
    where: { id: keyId },
    data: { status: next }
  });
}

/* ── Route policies ────────────────────────────────────────────── */

export async function listPolicies() {
  const configs = await listRoutePolicyConfigs();
  const allPolicies: RoutePolicy[] = ["cheap", "balanced", "premium", "auto"];

  return allPolicies.map((policy) => {
    const config = configs.find((c) => c.routePolicy === policy);
    return {
      routePolicy: policy,
      status: (config?.status as RoutePolicyConfigStatus | undefined) ?? null,
      targets: (config?.targets ?? []) as Array<{ provider: ProviderName; model: string }>,
      hasConfig: !!config
    };
  });
}

export async function toggleRoutePolicyStatus(routePolicy: RoutePolicy) {
  const existing = await db.routePolicyConfig.findUnique({
    where: { routePolicy }
  });

  if (!existing) {
    // Create with empty targets if not exists
    return db.routePolicyConfig.create({
      data: {
        routePolicy,
        status: RoutePolicyConfigStatus.ACTIVE,
        targets: []
      }
    });
  }

  const next = existing.status === RoutePolicyConfigStatus.ACTIVE
    ? RoutePolicyConfigStatus.DISABLED
    : RoutePolicyConfigStatus.ACTIVE;

  return db.routePolicyConfig.update({
    where: { routePolicy },
    data: { status: next }
  });
}
