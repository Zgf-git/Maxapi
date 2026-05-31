import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: userCreate
    }
  }
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(async () => "hashed-password")
}));

vi.mock("@/lib/auth/verification", () => ({
  sendEmailVerificationEmail: vi.fn(async () => ({ previewUrl: null }))
}));

vi.mock("@/lib/referral/service", () => ({
  createUniqueReferralCode: vi.fn(async () => "ABC12345"),
  findUserByReferralCode: vi.fn(async () => null)
}));

describe("register user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userCreate.mockResolvedValue({
      id: "user_1",
      email: "user@example.com"
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects self-signup in simple mode even if env signup flag is enabled", async () => {
    vi.resetModules();
    vi.stubEnv("APP_RUN_MODE", "simple");
    vi.stubEnv("ENABLE_SELF_SIGNUP", "true");

    const { registerUser } = await import("@/lib/auth/register");
    const formData = new FormData();
    formData.set("name", "User One");
    formData.set("email", "user@example.com");
    formData.set("password", "password123");

    const result = await registerUser({}, formData);

    expect(result).toEqual({
      error: "Account creation is currently disabled."
    });
    expect(userCreate).not.toHaveBeenCalled();
  });
});
