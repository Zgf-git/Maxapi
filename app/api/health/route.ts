import { NextResponse } from "next/server";

import { evaluateMonitoringAlerts, getMonitoringSnapshot } from "@/lib/monitoring/service";

export async function GET() {
  const snapshot = await getMonitoringSnapshot();
  await evaluateMonitoringAlerts(snapshot);
  const status = snapshot.system;

  return NextResponse.json({
    status: status.status,
    version: status.version,
    timestamp: status.timestamp,
    upstream: {
      platform: status.upstream.platform,
      keysTotal: status.upstream.keysTotal,
      keysHealthy: status.upstream.keysHealthy,
      keysUnhealthy: status.upstream.keysUnhealthy
    },
    pendingUsage: {
      count: snapshot.pendingUsageCount,
      threshold: snapshot.pendingUsageThreshold
    },
    cache: status.cache
  });
}
