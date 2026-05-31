import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    paymentProviderInstance: {
      findFirst: vi.fn().mockResolvedValue(null)
    },
    paymentWebhookEvent: {
      upsert: vi.fn(),
      update: vi.fn()
    },
    topUpPurchase: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  env: {
    PAYPAL_CLIENT_ID: "paypal-client",
    PAYPAL_CLIENT_SECRET: "paypal-secret",
    PAYPAL_WEBHOOK_ID: ""
  }
}));

vi.mock("@/lib/payments/paypal", () => ({
  verifyPayPalWebhookSignature: vi.fn(),
  handlePayPalWebhookEvent: vi.fn()
}));

describe("payment webhook route", () => {
  it("returns 503 for paypal when webhook configuration is incomplete", async () => {
    const { POST } = await import("@/app/api/payments/webhook/[provider]/route");

    const response = await POST(new Request("http://localhost/api/payments/webhook/paypal", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1", event_type: "PAYMENT.CAPTURE.COMPLETED" })
    }), {
      params: Promise.resolve({ provider: "paypal" })
    });

    expect(response.status).toBe(503);
  });

  it("returns 503 for providers that are not configured yet", async () => {
    const { POST } = await import("@/app/api/payments/webhook/[provider]/route");

    const response = await POST(new Request("http://localhost/api/payments/webhook/alipay", {
      method: "POST",
      body: "{}"
    }), {
      params: Promise.resolve({ provider: "alipay" })
    });

    expect(response.status).toBe(503);
  });
});
