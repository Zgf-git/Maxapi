import { beforeEach, describe, expect, it, vi } from "vitest";

const findApiKeyByHash = vi.fn();
const touchApiKeyLastUsed = vi.fn();

vi.mock("@/lib/api-keys/service", () => ({
  findApiKeyByHash,
  touchApiKeyLastUsed
}));

describe("API key auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing bearer tokens", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");

    const result = await authenticateApiKey(null);

    expect(result).toEqual({
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Missing API key. Use Authorization: Bearer <key> or X-Api-Key."
    });
  });

  it("accepts X-Api-Key authentication", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");

    findApiKeyByHash.mockResolvedValueOnce({
      id: "key-2",
      userId: "user-2",
      name: "Header key",
      status: "ACTIVE"
    });

    const result = await authenticateApiKey(null, "mk_live_header");

    expect(result).toEqual({
      ok: true,
      apiKeyId: "key-2",
      userId: "user-2",
      keyName: "Header key"
    });
  });

  it("rejects revoked API keys", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");

    findApiKeyByHash.mockResolvedValueOnce({
      id: "key-1",
      userId: "user-1",
      name: "Revoked key",
      status: "REVOKED"
    });

    const result = await authenticateApiKey("Bearer mk_live_revoked");

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "revoked_api_key",
      message: "This API key has been revoked.",
      apiKeyId: "key-1",
      userId: "user-1"
    });
  });

  it("authenticates active API keys and updates last used timestamp", async () => {
    const { authenticateApiKey, markApiKeyAuthenticatedUsage } = await import("@/lib/api-auth");

    findApiKeyByHash.mockResolvedValueOnce({
      id: "key-1",
      userId: "user-1",
      name: "Production key",
      status: "ACTIVE"
    });

    const result = await authenticateApiKey("Bearer mk_live_active");
    await markApiKeyAuthenticatedUsage("key-1");

    expect(result).toEqual({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Production key"
    });
    expect(touchApiKeyLastUsed).toHaveBeenCalledWith("key-1");
  });
});
