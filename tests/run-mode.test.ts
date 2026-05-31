import { describe, expect, it, vi } from "vitest";

describe("run mode helpers", () => {
  it("enables commercial surfaces in saas mode", async () => {
    vi.resetModules();
    vi.stubEnv("APP_RUN_MODE", "saas");
    vi.stubEnv("ENABLE_SELF_SIGNUP", "true");

    const { canSelfSignup, canShowPublicPricing, canUseBilling, canUseReferral } = await import("@/lib/run-mode");

    expect(canSelfSignup()).toBe(true);
    expect(canShowPublicPricing()).toBe(true);
    expect(canUseBilling()).toBe(true);
    expect(canUseReferral()).toBe(true);
  });

  it("disables signup and commercial surfaces in simple mode", async () => {
    vi.resetModules();
    vi.stubEnv("APP_RUN_MODE", "simple");
    vi.stubEnv("ENABLE_SELF_SIGNUP", "true");

    const { canSelfSignup, canShowPublicPricing, canUseBilling, canUseReferral, isSimpleMode } = await import("@/lib/run-mode");

    expect(isSimpleMode()).toBe(true);
    expect(canSelfSignup()).toBe(false);
    expect(canShowPublicPricing()).toBe(false);
    expect(canUseBilling()).toBe(false);
    expect(canUseReferral()).toBe(false);
  });
});

