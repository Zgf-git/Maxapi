import { env } from "@/lib/env";
import { getChatProvider, getConfiguredProviders } from "@/lib/providers/registry";

export type KeyPoolPublicStatus = {
  id: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  totalRequests: number;
  totalFailures: number;
};

export type SystemStatus = {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  upstream: {
    platform: string;
    keysTotal: number;
    keysHealthy: number;
    keysUnhealthy: number;
    keyPool: KeyPoolPublicStatus[];
  };
  cache: {
    backend: "memory" | "redis";
  };
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const providerNames = await getConfiguredProviders();
  let totalKeys = 0;
  let totalHealthy = 0;
  let totalUnhealthy = 0;
  const allKeyPool: KeyPoolPublicStatus[] = [];

  for (const providerName of providerNames) {
    try {
      const provider = await getChatProvider(providerName);
      const snapshot = provider.getKeyPoolSnapshot();
      const healthyCount = snapshot.filter((k) => k.isHealthy).length;
      totalKeys += snapshot.length;
      totalHealthy += healthyCount;
      totalUnhealthy += snapshot.length - healthyCount;
      allKeyPool.push(
        ...snapshot.map((k) => ({
          id: `${providerName}:${k.id}`,
          isHealthy: k.isHealthy,
          consecutiveFailures: k.consecutiveFailures,
          lastFailureAt: k.lastFailureAt?.toISOString() ?? null,
          cooldownUntil: k.cooldownUntil?.toISOString() ?? null,
          totalRequests: k.totalRequests,
          totalFailures: k.totalFailures
        }))
      );
    } catch {
      // skip providers that fail to resolve
    }
  }

  let status: SystemStatus["status"] = "ok";

  if (totalKeys === 0) {
    status = "down";
  } else if (totalUnhealthy === totalKeys) {
    status = "down";
  } else if (totalUnhealthy > 0) {
    status = "degraded";
  }

  return {
    status,
    version: "2.0.1",
    timestamp: new Date().toISOString(),
    upstream: {
      platform: env.UPSTREAM_PLATFORM_NAME,
      keysTotal: totalKeys,
      keysHealthy: totalHealthy,
      keysUnhealthy: totalUnhealthy,
      keyPool: allKeyPool
    },
    cache: {
      backend: env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? "redis" : "memory"
    }
  };
}
