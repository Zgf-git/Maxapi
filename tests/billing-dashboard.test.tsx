import React from "react";
import { BalanceTransactionType, PaymentProvider, RequestLogStatus, RequestType, UsageLedgerStatus } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BillingResolutionsTable } from "@/components/billing/billing-resolutions-table";
import { TopUpCard } from "@/components/billing/top-up-card";
import { TopUpPurchasesTable } from "@/components/billing/top-up-purchases-table";
import { TransactionsTable } from "@/components/billing/transactions-table";
import { UsageLedgerTable } from "@/components/billing/usage-ledger-table";
import { formatUsdMicros } from "@/lib/utils";
import {
  buildBillingSummary,
  type BillingResolutionRow,
  type BillingTopUpPurchaseRow,
  type BillingTransactionRow,
  type BillingUsageLedgerRow
} from "@/lib/billing/dashboard";

vi.mock("@/components/billing/actions", () => ({
  grantDeveloperCreditAction: vi.fn()
}));

const requestLog = {
  id: "req_1",
  apiKeyId: "key_1",
  userId: "user_1",
  provider: "apimart",
  upstreamModel: "deepseek-v3.1",
  requestedModel: "deepseek-v3.1",
  routePolicy: null,
  fallbackUsed: false,
  fallbackFromProvider: null,
  fallbackFromModel: null,
  routeReason: "explicit_model:deepseek-v3.1",
  requestType: RequestType.CHAT_COMPLETION,
  isStream: false,
  status: RequestLogStatus.SUCCESS,
  httpStatus: 200,
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  latencyMs: 120,
  errorCode: null,
  errorMessage: null,
  createdAt: new Date("2026-04-18T00:00:00Z")
};

const ledgerEntry: BillingUsageLedgerRow = {
  id: "ledger_1",
  userId: "user_1",
  apiKeyId: "key_1",
  requestLogId: "req_1",
  provider: "apimart",
  requestedModel: "deepseek-v3.1",
  upstreamModel: "deepseek-v3.1",
  pricingVersion: "apimart-usd-2026-05-01",
  pricingSnapshot: null,
  usageSnapshot: null,
  status: UsageLedgerStatus.FINALIZED,
  isStream: false,
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  promptCacheHitTokens: 10,
  promptCacheMissTokens: 90,
  reasoningTokens: null,
  inputCostUsdMicros: 100n,
  outputCostUsdMicros: 200n,
  totalCostUsdMicros: 300n,
  chargedAt: new Date("2026-04-18T00:00:01Z"),
  createdAt: new Date("2026-04-18T00:00:01Z"),
  finalizedAt: new Date("2026-04-18T00:00:01Z"),
  notes: null,
  errorReason: null,
  requestLog
};

const debitTransaction: BillingTransactionRow = {
  id: "txn_1",
  userId: "user_1",
  type: BalanceTransactionType.DEBIT,
  amountUsdMicros: 300n,
  balanceBeforeUsdMicros: 10_000_000n,
  balanceAfterUsdMicros: 9_999_700n,
  usageLedgerId: "ledger_1",
  billingResolutionId: null,
  reason: "chat_completion:apimart:deepseek-v3.1",
  createdAt: new Date("2026-04-18T00:00:02Z"),
  topUpPurchaseId: null,
  topUpPurchase: null,
  usageLedgerEntry: {
    ...ledgerEntry
  }
};

const topUpPurchase: BillingTopUpPurchaseRow = {
  id: "purchase_1",
  userId: "user_1",
  packageId: "topup_25",
  paymentProvider: PaymentProvider.PAYPAL,
  paymentProviderInstanceId: null,
  providerOrderId: "paypal_order_1",
  providerPaymentId: "paypal_capture_1",
  providerEventIdLastProcessed: "paypal_event_1",
  providerMetadata: null,
  amountUsdCents: 2500,
  creditsUsdMicros: 25_000_000n,
  refundedUsdMicros: 5_000_000n,
  status: "CREDITED",
  createdAt: new Date("2026-04-18T00:00:03Z"),
  updatedAt: new Date("2026-04-18T00:00:03Z"),
  creditedAt: new Date("2026-04-18T00:00:05Z"),
  refundedAt: new Date("2026-04-19T00:00:05Z"),
  notes: null,
  balanceTransaction: null,
  billingResolutions: []
};

const resolution: BillingResolutionRow = {
  id: "resolution_1",
  userId: "user_1",
  topUpPurchaseId: "purchase_1",
  type: "REFUND",
  status: "APPLIED",
  amountUsdMicros: -5_000_000n,
  reason: "Partial refund",
  operatorNotes: null,
  paymentProvider: PaymentProvider.PAYPAL,
  providerRefundId: "refund_ref_1",
  providerRefundAmountMinor: 500,
  createdAt: new Date("2026-04-19T00:00:05Z"),
  updatedAt: new Date("2026-04-19T00:00:05Z"),
  appliedAt: new Date("2026-04-19T00:01:05Z"),
  canceledAt: null,
  topUpPurchase,
  balanceTransaction: null
};

describe("billing dashboard helpers", () => {
  it("preserves sub-cent USD micros instead of displaying non-zero charges as zero", () => {
    expect(formatUsdMicros(300n)).toBe("$0.000300");
    expect(formatUsdMicros(10_000_000n)).toBe("$10.00");
  });

  it("normalizes real aggregate values without inventing spend", () => {
    expect(
      buildBillingSummary({
        spendLast24hUsdMicros: 300n,
        spendLast7dUsdMicros: null,
        creditsLast30dUsdMicros: 10_000_000n,
        lastChargeAt: null
      })
    ).toEqual({
      spendLast24hUsdMicros: 300n,
      spendLast7dUsdMicros: 0n,
      creditsLast30dUsdMicros: 10_000_000n,
      lastChargeAt: null
    });
  });
});

describe("billing dashboard components", () => {
  it("renders debits with linked requests and no sensitive fields", () => {
    const html = renderToStaticMarkup(<TransactionsTable rows={[debitTransaction]} />);

    expect(html).toContain("Debit");
    expect(html).toContain("-$0.000300");
    expect(html).toContain("/dashboard/requests/req_1");
    expect(html).not.toContain("keyHash");
    expect(html).not.toContain("Authorization");
  });

  it("renders usage ledger provider, model, cost, and status", () => {
    const html = renderToStaticMarkup(<UsageLedgerTable rows={[ledgerEntry]} />);

    expect(html).toContain("deepseek-v3.1");
    expect(html).toContain("Finalized");
    expect(html).toContain("$0.000300");
    expect(html).toContain("/dashboard/requests/req_1");
  });

  it("renders top-up orders and refund records", () => {
    const purchasesHtml = renderToStaticMarkup(<TopUpPurchasesTable rows={[topUpPurchase]} />);
    const resolutionsHtml = renderToStaticMarkup(<BillingResolutionsTable rows={[resolution]} />);

    expect(purchasesHtml).toContain("topup_25");
    expect(purchasesHtml).toContain("All orders");
    expect(purchasesHtml).toContain("View");
    expect(purchasesHtml).toContain("credited");
    expect(purchasesHtml).toContain("$25.00");
    expect(resolutionsHtml).toContain("All types");
    expect(resolutionsHtml).toContain("All states");
    expect(resolutionsHtml).toContain("Partial refund");
    expect(resolutionsHtml).toContain("refund_ref_1");
    expect(resolutionsHtml).toContain("-$5.00");
  });

  it("does not imply unsupported card payments in top-up copy", () => {
    const html = renderToStaticMarkup(
      <TopUpCard
        canGrantDeveloperCredit={false}
        developerCreditUsdMicros={10_000_000n}
        paymentProviders={[]}
        topUpPackages={[]}
      />
    );

    expect(html).toContain("No payment provider is configured");
    expect(html).not.toContain("Pay with Stripe");
  });
});
