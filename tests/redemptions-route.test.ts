import { beforeEach, describe, expect, it, vi } from "vitest";

const getActionUser = vi.fn();
const redeemCode = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getActionUser
}));

vi.mock("@/lib/redemption/service", () => ({
  redeemCode
}));

describe("redemptions API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActionUser.mockResolvedValue({ id: "user_1", email: "user@example.com" });
    redeemCode.mockResolvedValue({
      ok: true,
      amountUsdMicros: 1_000_000n,
      balanceAfterUsdMicros: 2_000_000n,
      balanceTransactionId: "txn_1"
    });
  });

  it("redeems a signed-in user's code", async () => {
    const { POST } = await import("@/app/api/redemptions/route");

    const response = await POST(
      new Request("http://localhost/api/redemptions", {
        method: "POST",
        body: JSON.stringify({ code: "MAX-ABC" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      amountUsdMicros: "1000000"
    });
    expect(redeemCode).toHaveBeenCalledWith({
      userId: "user_1",
      code: "MAX-ABC"
    });
  });

  it("requires authentication", async () => {
    const { POST } = await import("@/app/api/redemptions/route");
    getActionUser.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/redemptions", {
        method: "POST",
        body: JSON.stringify({ code: "MAX-ABC" })
      })
    );

    expect(response.status).toBe(401);
    expect(redeemCode).not.toHaveBeenCalled();
  });
});
