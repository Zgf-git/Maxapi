import { UsageLedgerStatus } from "@prisma/client";

import { sendDedupedOperatorAlert } from "@/lib/alerts/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSystemStatus } from "@/lib/status/service";

export type MonitoringSnapshot = {
  system: Awaited<ReturnType<typeof getSystemStatus>>;
  pendingUsageCount: number;
  pendingUsageThreshold: number;
};

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const [system, pendingUsageCount] = await Promise.all([
    getSystemStatus(),
    db.usageLedgerEntry.count({
      where: {
        status: UsageLedgerStatus.PENDING
      }
    })
  ]);

  return {
    system,
    pendingUsageCount,
    pendingUsageThreshold: env.ALERT_PENDING_USAGE_THRESHOLD
  };
}

export async function evaluateMonitoringAlerts(snapshot: MonitoringSnapshot) {
  if (snapshot.system.status === "down") {
    await sendDedupedOperatorAlert({
      dedupKey: "monitoring:provider_down",
      title: "Upstream provider pool is down",
      severity: "critical",
      source: "monitoring.health",
      details: {
        platform: snapshot.system.upstream.platform,
        keysTotal: snapshot.system.upstream.keysTotal,
        keysHealthy: snapshot.system.upstream.keysHealthy,
        keysUnhealthy: snapshot.system.upstream.keysUnhealthy
      }
    });
  } else if (snapshot.system.status === "degraded") {
    await sendDedupedOperatorAlert({
      dedupKey: "monitoring:provider_degraded",
      title: "Upstream provider pool is degraded",
      severity: "warning",
      source: "monitoring.health",
      details: {
        platform: snapshot.system.upstream.platform,
        keysTotal: snapshot.system.upstream.keysTotal,
        keysHealthy: snapshot.system.upstream.keysHealthy,
        keysUnhealthy: snapshot.system.upstream.keysUnhealthy
      }
    });
  }

  if (snapshot.pendingUsageCount >= snapshot.pendingUsageThreshold) {
    await sendDedupedOperatorAlert({
      dedupKey: "monitoring:pending_usage_backlog",
      title: "Pending usage backlog exceeded threshold",
      severity: "warning",
      source: "monitoring.health",
      details: {
        pendingUsageCount: snapshot.pendingUsageCount,
        threshold: snapshot.pendingUsageThreshold
      }
    });
  }
}
