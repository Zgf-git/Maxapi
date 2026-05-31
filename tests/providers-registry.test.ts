import { beforeEach, describe, expect, it, vi } from "vitest";

const getRuntimeProviderConfig = vi.fn();

vi.mock("@/lib/providers/admin", () => ({
  getRuntimeProviderConfig
}));

describe("provider registry capability checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeProviderConfig.mockResolvedValue(null);
  });

  it("rejects embedding capability when the provider does not support embeddings", async () => {
    const { getProviderForCapability } = await import("@/lib/providers/registry");

    await expect(getProviderForCapability("apimart", "embeddings")).rejects.toThrow(
      "Provider does not support embeddings: apimart"
    );
  });

  it("selects the first configured provider that supports the requested capability", async () => {
    const { getFirstConfiguredProviderForCapability } = await import("@/lib/providers/registry");

    const provider = await getFirstConfiguredProviderForCapability("embeddings");

    expect(provider).toBeDefined();
  });
});
