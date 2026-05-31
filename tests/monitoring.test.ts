import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const getSystemStatus = vi.fn();
const sendDedupedOperatorAlert = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    usageLedgerEntry: {
      count
    }
  }
}));

vi.mock("@/lib/status/service", () => ({
  getSystemStatus
}));

vi.mock("@/lib/alerts/service", () => ({
  sendDedupedOperatorAlert
}));

vi.mock("@/lib/env", () => ({
  env: {
    ALERT_PENDING_USAGE_THRESHOLD: 25
  }
}));

describe("monitoring service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits a critical alert when all upstream keys are down", async () => {
    count.mockResolvedValueOnce(0);
    getSystemStatus.mockResolvedValueOnce({
      status: "down",
      version: "2.0.1",
      timestamp: new Date().toISOString(),
      upstream: {
        platform: "APIMart",
        keysTotal: 2,
        keysHealthy: 0,
        keysUnhealthy: 2,
        keyPool: []
      },
      cache: { backend: "memory" }
    });

    const { getMonitoringSnapshot, evaluateMonitoringAlerts } = await import("@/lib/monitoring/service");
    const snapshot = await getMonitoringSnapshot();
    await evaluateMonitoringAlerts(snapshot);

    expect(sendDedupedOperatorAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupKey: "monitoring:provider_down",
        severity: "critical"
      })
    );
  });

  it("emits a warning when pending usage backlog exceeds threshold", async () => {
    count.mockResolvedValueOnce(30);
    getSystemStatus.mockResolvedValueOnce({
      status: "ok",
      version: "2.0.1",
      timestamp: new Date().toISOString(),
      upstream: {
        platform: "APIMart",
        keysTotal: 2,
        keysHealthy: 2,
        keysUnhealthy: 0,
        keyPool: []
      },
      cache: { backend: "memory" }
    });

    const { getMonitoringSnapshot, evaluateMonitoringAlerts } = await import("@/lib/monitoring/service");
    const snapshot = await getMonitoringSnapshot();
    await evaluateMonitoringAlerts(snapshot);

    expect(sendDedupedOperatorAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupKey: "monitoring:pending_usage_backlog",
        severity: "warning",
        details: expect.objectContaining({
          pendingUsageCount: 30,
          threshold: 25
        })
      })
    );
  });
});
