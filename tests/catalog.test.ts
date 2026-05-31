import { describe, expect, it } from "vitest";

import { getCatalogExplicitModels, getCatalogPolicyEntries, getPublicCatalogEntries, getPublicCatalogEntryBySlug, getPublicCatalogModels, getPublicCatalogSlugs } from "@/lib/catalog";
import { getProviderForModel } from "@/lib/routing/config";

describe("models catalog", () => {
  it("has no duplicate entry ids and references valid provider/model pairs", () => {
    const explicitModels = getCatalogExplicitModels();
    const policyEntries = getCatalogPolicyEntries();
    const ids = [...explicitModels, ...policyEntries].map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const model of explicitModels) {
      expect(getProviderForModel(model.upstreamModel)).toBe(model.provider);
    }

    for (const policy of policyEntries) {
      expect(getProviderForModel(policy.defaultModel)).toBe(policy.defaultProvider);
      if (policy.fallbackModel) {
        expect(getProviderForModel(policy.fallbackModel)).toBe(policy.fallbackProvider);
      }
      expect(policy.targets[0]).toEqual({
        provider: policy.defaultProvider,
        model: policy.defaultModel
      });
    }
  });

  it("exposes both direct and aggregator-backed public models", () => {
    const publicModelIds = getPublicCatalogModels().map((entry) => entry.id);

    expect(publicModelIds).toContain("gpt-4o");
    expect(publicModelIds).toContain("gpt-4o-mini");
    expect(publicModelIds).toContain("gpt-5.4");
    expect(publicModelIds).toContain("gpt-5.4-mini");
    expect(publicModelIds).toContain("text-embedding-3-small");
    expect(publicModelIds).toContain("deepseek-v3.1");
    expect(publicModelIds).toContain("gemini-2.5-flash");
  });

  it("includes route policy entries for public rendering", () => {
    const policyIds = getCatalogPolicyEntries().map((entry) => entry.id);

    expect(policyIds).toEqual(["cheap", "balanced", "premium", "auto"]);
  });

  it("resolves only public model and policy detail slugs", () => {
    expect(getPublicCatalogSlugs()).toContain("gpt-4o");
    expect(getPublicCatalogSlugs()).toContain("gpt-4o-mini");
    expect(getPublicCatalogSlugs()).toContain("deepseek-v31");
    expect(getPublicCatalogSlugs()).toContain("auto");
    expect(getPublicCatalogEntryBySlug("gpt-4o")?.kind).toBe("model");
    expect(getPublicCatalogEntryBySlug("auto")?.kind).toBe("policy");
    expect(getPublicCatalogEntryBySlug("deepseek-chat")).toBeNull();
  });
});
