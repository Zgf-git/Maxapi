import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = {
  apiKey: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

describe("api key helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("generates a namespaced API key", async () => {
    const { generatePlaintextApiKey } = await import("@/lib/api-keys/service");
    const key = generatePlaintextApiKey();

    expect(key.startsWith("mk_live_")).toBe(true);
    expect(key.length).toBeGreaterThan(20);
  });

  it("hashes deterministically without returning plaintext", async () => {
    const { hashApiKey } = await import("@/lib/api-keys/service");
    const key = "mk_live_example-secret-value";
    const hash = hashApiKey(key);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(key);
    expect(hashApiKey(key)).toBe(hash);
  });

  it("returns consistent display helpers", async () => {
    const { getApiKeyLastFour, getApiKeyPrefix, maskApiKeySuffix } = await import(
      "@/lib/api-keys/service"
    );
    const key = "mk_live_abcdefghijklmnopqrstuv";

    expect(getApiKeyPrefix(key)).toBe("mk_live_abcdefgh");
    expect(getApiKeyLastFour(key)).toBe("stuv");
    expect(maskApiKeySuffix("stuv")).toBe("••••stuv");
  });

  it("scopes API key listings to the requesting user", async () => {
    const { listApiKeys } = await import("@/lib/api-keys/service");

    dbMock.apiKey.findMany.mockResolvedValueOnce([]);

    await listApiKeys("user-a");

    expect(dbMock.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: "user-a" },
      orderBy: { createdAt: "desc" }
    });
  });

  it("does not revoke another user's API key", async () => {
    const { revokeApiKey } = await import("@/lib/api-keys/service");

    dbMock.apiKey.findFirst.mockResolvedValueOnce(null);

    const result = await revokeApiKey("user-a", "key-owned-by-user-b");

    expect(result).toEqual({ ok: false, error: "API key not found." });
    expect(dbMock.apiKey.update).not.toHaveBeenCalled();
    expect(dbMock.apiKey.findFirst).toHaveBeenCalledWith({
      where: {
        id: "key-owned-by-user-b",
        userId: "user-a"
      }
    });
  });

  it("rejects revoked keys during verification", async () => {
    const { hashApiKey, verifyApiKey } = await import("@/lib/api-keys/service");
    const plaintextKey = "mk_live_revoked-example";

    dbMock.apiKey.findFirst.mockResolvedValueOnce(null);

    const result = await verifyApiKey(plaintextKey);

    expect(result).toBeNull();
    expect(dbMock.apiKey.findFirst).toHaveBeenCalledWith({
      where: {
        keyHash: hashApiKey(plaintextKey),
        status: "ACTIVE"
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
  });
});
