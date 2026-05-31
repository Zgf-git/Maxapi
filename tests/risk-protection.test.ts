import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  $executeRawUnsafe: vi.fn(),
  $transaction: vi.fn(async (callback) => callback(db)),
  user: {
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  apiKey: {
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  rateLimitCounter: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  concurrencyLease: {
    deleteMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn()
  },
  abuseEvent: {
    create: vi.fn(),
    count: vi.fn()
  }
};

vi.mock("@/lib/db", () => ({
  db
}));

vi.mock("@/lib/env", () => ({
  env: {
    RATE_LIMIT_API_KEY_PER_MINUTE: 1,
    RATE_LIMIT_USER_PER_MINUTE: 10,
    RATE_LIMIT_IP_PER_MINUTE: 10,
    CONCURRENT_API_KEY_LIMIT: 1,
    CONCURRENT_USER_LIMIT: 10,
    RISK_ESCALATION_LIMIT_HITS: 2,
    RISK_MAX_REQUEST_BODY_CHARS: 100,
    RISK_NEW_USER_AGE_HOURS: 24,
    RISK_NEW_USER_MAX_REQUEST_BODY_CHARS: 20
  }
}));

const baseContext = {
  userId: "user_1",
  apiKeyId: "key_1",
  ipAddress: "203.0.113.10",
  requestedModel: "gpt-4o",
  routePolicy: null,
  isStream: false
};

function mockNormalEntities() {
  db.user.findUnique.mockResolvedValue({ riskState: "NORMAL", createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) });
  db.apiKey.findUnique.mockResolvedValue({ riskState: "NORMAL", status: "ACTIVE" });
}

function mockRateCountersUnderLimit() {
  db.rateLimitCounter.findUnique.mockResolvedValue(null);
  db.rateLimitCounter.create.mockResolvedValue({ count: 1 });
}

function mockNoConcurrency() {
  db.concurrencyLease.deleteMany.mockResolvedValue({ count: 0 });
  db.concurrencyLease.count.mockResolvedValue(0);
  db.concurrencyLease.createMany.mockResolvedValue({ count: 2 });
}

describe("request protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$executeRawUnsafe.mockResolvedValue(0);
    db.$transaction.mockImplementation(async (callback) => callback(db));
    db.abuseEvent.create.mockResolvedValue({ id: "abuse_1" });
    db.abuseEvent.count.mockResolvedValue(0);
    db.user.updateMany.mockResolvedValue({ count: 0 });
    db.apiKey.updateMany.mockResolvedValue({ count: 0 });
  });

  it("blocks when the per-key rate limit is exceeded and records an abuse event", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    mockNormalEntities();
    db.rateLimitCounter.findUnique.mockResolvedValue({
      count: 1,
      expiresAt: new Date(Date.now() + 60_000)
    });
    db.rateLimitCounter.update.mockResolvedValue({ count: 2 });

    await expect(enforceRequestProtection(baseContext)).rejects.toMatchObject({
      status: 429,
      code: "rate_limited"
    });
    expect(db.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "rate:apiKey:key_1:minute"
    );
    expect(db.abuseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "rate_limit_hit",
          reasonCode: "api_key_rate_limit",
          apiKeyId: "key_1",
          userId: "user_1"
        })
      })
    );
  });

  it("blocks user-level aggregated usage across keys", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    mockNormalEntities();
    db.rateLimitCounter.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) =>
      where.key.startsWith("user:") ? { count: 10, expiresAt: new Date(Date.now() + 60_000) } : null
    );
    db.rateLimitCounter.create.mockResolvedValue({ count: 1 });
    db.rateLimitCounter.update.mockResolvedValue({ count: 11 });

    await expect(enforceRequestProtection(baseContext)).rejects.toMatchObject({
      status: 429,
      code: "rate_limited"
    });
    expect(db.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "rate:user:user_1:minute"
    );
    expect(db.abuseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reasonCode: "user_rate_limit"
        })
      })
    );
  });

  it("blocks when concurrency is already at the API key limit", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    mockNormalEntities();
    mockRateCountersUnderLimit();
    db.concurrencyLease.deleteMany.mockResolvedValue({ count: 0 });
    db.concurrencyLease.count.mockResolvedValueOnce(1);

    await expect(enforceRequestProtection(baseContext)).rejects.toMatchObject({
      status: 429,
      code: "concurrent_limit_exceeded"
    });
    expect(db.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "concurrency:apiKey:key_1"
    );
    expect(db.abuseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "concurrent_limit_hit",
          reasonCode: "api_key_concurrent_limit"
        })
      })
    );
  });

  it("denies suspended API keys before rate counters are touched", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    db.user.findUnique.mockResolvedValue({ riskState: "NORMAL" });
    db.apiKey.findUnique.mockResolvedValue({ riskState: "SUSPENDED", status: "ACTIVE" });

    await expect(enforceRequestProtection(baseContext)).rejects.toMatchObject({
      status: 403,
      code: "api_key_suspended"
    });
    expect(db.rateLimitCounter.findUnique).not.toHaveBeenCalled();
    expect(db.abuseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "risk_state_block",
          reasonCode: "api_key_suspended"
        })
      })
    );
  });

  it("returns a releasable concurrency lease for allowed requests", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    mockNormalEntities();
    mockRateCountersUnderLimit();
    mockNoConcurrency();

    const lease = await enforceRequestProtection(baseContext);
    await lease.release();

    expect(db.concurrencyLease.createMany).toHaveBeenCalled();
    expect(db.concurrencyLease.deleteMany).toHaveBeenLastCalledWith({
      where: {
        holderId: lease.holderId
      }
    });
  });

  it("blocks oversized request bodies before counters are touched", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    mockNormalEntities();

    await expect(
      enforceRequestProtection({
        ...baseContext,
        requestBodyChars: 101
      })
    ).rejects.toMatchObject({
      status: 413,
      code: "request_too_large"
    });
    expect(db.rateLimitCounter.findUnique).not.toHaveBeenCalled();
  });

  it("blocks large request bodies for new accounts", async () => {
    const { enforceRequestProtection } = await import("@/lib/risk/protection");

    db.user.findUnique.mockResolvedValue({
      riskState: "NORMAL",
      createdAt: new Date(Date.now() - 60 * 60 * 1000)
    });
    db.apiKey.findUnique.mockResolvedValue({ riskState: "NORMAL", status: "ACTIVE" });

    await expect(
      enforceRequestProtection({
        ...baseContext,
        requestBodyChars: 21
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "new_user_context_limit"
    });
    expect(db.rateLimitCounter.findUnique).not.toHaveBeenCalled();
  });
});
