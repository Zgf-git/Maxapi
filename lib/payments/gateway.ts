import { BalanceTransactionType, PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildAlipayCheckoutUrl } from "@/lib/payments/alipay";
import { capturePayPalOrderWithConfig, getPayPalAccessToken } from "@/lib/payments/paypal";
import {
  getActiveAlipayRuntime,
  getActivePayPalRuntime,
  getActiveWeChatRuntime,
  selectAlipayRuntime,
  selectPayPalRuntime,
  selectWeChatRuntime
} from "@/lib/payments/provider-instances";
import { getTopUpPackage } from "@/lib/payments/topup-packages";
import { createWeChatNativeOrder } from "@/lib/payments/wechat";
import { processReferralCommission } from "@/lib/referral/service";

type CreateCheckoutInput = {
  userId: string;
  packageId: string;
  provider: PaymentProvider;
};

type CreateCheckoutResult =
  | { ok: true; checkoutUrl: string; topUpPurchaseId: string }
  | { ok: false; status: number; error: string };

function appendMinorUnits(amountUsdCents: number) {
  return (amountUsdCents / 100).toFixed(2);
}

async function createPendingPurchase(input: CreateCheckoutInput, paymentProviderInstanceId: string | null) {
  const topUpPackage = getTopUpPackage(input.packageId);

  if (!topUpPackage) {
    return { ok: false as const, error: "Unknown top-up package." };
  }

  const purchase = await db.topUpPurchase.create({
    data: {
      userId: input.userId,
      packageId: topUpPackage.id,
      paymentProvider: input.provider,
      paymentProviderInstanceId,
      amountUsdCents: topUpPackage.amountUsdCents,
      creditsUsdMicros: topUpPackage.creditsUsdMicros,
      status: TopUpPurchaseStatus.CREATED
    }
  });

  return { ok: true as const, purchase, topUpPackage };
}

async function createPayPalCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const topUpPackage = getTopUpPackage(input.packageId);
  if (!topUpPackage) {
    return { ok: false, status: 400, error: "Unknown top-up package." };
  }

  const runtime = await selectPayPalRuntime(topUpPackage.amountUsdCents);
  if (!runtime) {
    return { ok: false, status: 503, error: "PayPal is not configured in this environment." };
  }

  const pending = await createPendingPurchase(input, runtime.instanceId);
  if (!pending.ok) {
    return { ok: false, status: 400, error: pending.error };
  }

  const { purchase } = pending;
  const accessToken = await getPayPalAccessToken(runtime.config);
  const response = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: purchase.id,
          custom_id: purchase.id,
          description: `MaxAPI ${topUpPackage.label}`,
          amount: {
            currency_code: "USD",
            value: appendMinorUnits(topUpPackage.amountUsdCents)
          }
        }
      ],
      application_context: {
        brand_name: "MaxAPI",
        user_action: "PAY_NOW",
        return_url: `${env.APP_BASE_URL}/dashboard/billing/success?purchase_id=${purchase.id}&provider=paypal`,
        cancel_url: `${env.APP_BASE_URL}/dashboard/billing/cancel?purchase_id=${purchase.id}&provider=paypal`
      }
    }),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);
  const approveUrl = payload?.links?.find?.((link: { rel?: string; href?: string }) => link.rel === "approve")?.href;

  if (!response.ok || !payload?.id || !approveUrl) {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        status: TopUpPurchaseStatus.FAILED,
        notes: payload?.message ?? "paypal_checkout_creation_failed"
      }
    });

    return {
      ok: false,
      status: 502,
      error: payload?.message ?? "Could not create PayPal checkout."
    };
  }

  await db.topUpPurchase.update({
    where: { id: purchase.id },
    data: {
      providerOrderId: payload.id,
      status: TopUpPurchaseStatus.CHECKOUT_CREATED
    }
  });

  return { ok: true, checkoutUrl: approveUrl, topUpPurchaseId: purchase.id };
}

async function createAlipayCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const topUpPackage = getTopUpPackage(input.packageId);
  if (!topUpPackage) {
    return { ok: false, status: 400, error: "Unknown top-up package." };
  }

  const runtime = await selectAlipayRuntime(topUpPackage.amountUsdCents);
  if (!runtime) {
    return { ok: false, status: 503, error: "支付宝商户参数尚未配置。" };
  }

  const pending = await createPendingPurchase(input, runtime.instanceId);
  if (!pending.ok) {
    return { ok: false, status: 400, error: pending.error };
  }

  const { purchase } = pending;

  try {
      const checkout = buildAlipayCheckoutUrl({
        purchaseId: purchase.id,
        topUpPackage,
        runtimeConfig: runtime.config
      });

    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        providerOrderId: purchase.id,
        providerMetadata: {
          chargeCurrency: "CNY",
          chargeAmountFen: checkout.totalAmountCnyFen
        },
        status: TopUpPurchaseStatus.CHECKOUT_CREATED
      }
    });

    return { ok: true, checkoutUrl: checkout.url, topUpPurchaseId: purchase.id };
  } catch (error) {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        status: TopUpPurchaseStatus.FAILED,
        notes: error instanceof Error ? error.message : "alipay_checkout_creation_failed"
      }
    });

    return { ok: false, status: 502, error: "Could not create Alipay checkout." };
  }
}

async function createWeChatCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const topUpPackage = getTopUpPackage(input.packageId);
  if (!topUpPackage) {
    return { ok: false, status: 400, error: "Unknown top-up package." };
  }

  const runtime = await selectWeChatRuntime(topUpPackage.amountUsdCents);
  if (!runtime) {
    return { ok: false, status: 503, error: "微信支付商户参数尚未配置。" };
  }

  const pending = await createPendingPurchase(input, runtime.instanceId);
  if (!pending.ok) {
    return { ok: false, status: 400, error: pending.error };
  }

  const { purchase } = pending;

  try {
      const { response, payload, amountFen } = await createWeChatNativeOrder({
        purchaseId: purchase.id,
        topUpPackage,
        runtimeConfig: runtime.config
      });

    if (!response.ok || !payload?.code_url) {
      await db.topUpPurchase.update({
        where: { id: purchase.id },
        data: {
          status: TopUpPurchaseStatus.FAILED,
          notes: payload?.message ?? payload?.code ?? "wechat_checkout_creation_failed"
        }
      });

      return { ok: false, status: 502, error: payload?.message ?? "Could not create WeChat Pay order." };
    }

    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        providerOrderId: purchase.id,
        providerMetadata: {
          codeUrl: payload.code_url,
          chargeCurrency: "CNY",
          chargeAmountFen: amountFen
        },
        status: TopUpPurchaseStatus.CHECKOUT_CREATED
      }
    });

    return {
      ok: true,
      checkoutUrl: `${env.APP_BASE_URL}/dashboard/billing/wechat?purchase_id=${purchase.id}`,
      topUpPurchaseId: purchase.id
    };
  } catch (error) {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        status: TopUpPurchaseStatus.FAILED,
        notes: error instanceof Error ? error.message : "wechat_checkout_creation_failed"
      }
    });

    return { ok: false, status: 502, error: "Could not create WeChat Pay order." };
  }
}

function unconfiguredProviderMessage(provider: PaymentProvider) {
  switch (provider) {
    case PaymentProvider.ALIPAY:
      return "支付宝商户参数尚未配置。";
    case PaymentProvider.WECHAT:
      return "微信支付商户参数尚未配置。";
    default:
      return "This payment provider is not configured.";
  }
}

export async function createUnifiedTopUpCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  switch (input.provider) {
    case PaymentProvider.PAYPAL:
      return createPayPalCheckout(input);
    case PaymentProvider.ALIPAY:
      return createAlipayCheckout(input);
    case PaymentProvider.WECHAT:
      return createWeChatCheckout(input);
    default:
      return { ok: false, status: 400, error: "Unknown payment provider." };
  }
}

export async function getTopUpPurchaseForUser(userId: string, purchaseId: string) {
  return db.topUpPurchase.findFirst({
    where: { id: purchaseId, userId },
    include: { balanceTransaction: true }
  });
}

export async function markTopUpCanceled(userId: string, purchaseId: string) {
  const purchase = await db.topUpPurchase.findFirst({
    where: {
      id: purchaseId,
      userId
    }
  });

  if (!purchase || purchase.status === TopUpPurchaseStatus.CREDITED) {
    return { ok: true as const };
  }

  await db.topUpPurchase.update({
    where: { id: purchase.id },
    data: { status: TopUpPurchaseStatus.CANCELED, notes: "checkout_canceled_by_user" }
  });

  return { ok: true as const };
}

export async function capturePayPalOrderForPurchase(userId: string, purchaseId: string) {
  const purchase = await db.topUpPurchase.findFirst({
    where: {
      id: purchaseId,
      userId,
      paymentProvider: PaymentProvider.PAYPAL
    },
    include: {
      balanceTransaction: true
    }
  });

  if (!purchase) {
    return { ok: false as const, error: "Top-up purchase not found." };
  }

  if (purchase.status === TopUpPurchaseStatus.CREDITED && purchase.balanceTransaction) {
    return { ok: true as const, purchase, credited: false as const };
  }

  if (!purchase.providerOrderId) {
    return { ok: false as const, error: "Missing PayPal order ID for this purchase." };
  }

  const runtime = await getActivePayPalRuntime();
  if (!runtime) {
    return { ok: false as const, error: "PayPal is not configured in this environment." };
  }

  const { response, payload } = await capturePayPalOrderWithConfig(purchase.providerOrderId, runtime.config);

  if (!response.ok || payload?.status !== "COMPLETED") {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        status: TopUpPurchaseStatus.FAILED,
        notes: payload?.message ?? "paypal_capture_failed"
      }
    });

    return { ok: false as const, error: payload?.message ?? "PayPal capture failed." };
  }

  const captureId = payload?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

  const creditedPurchase = await db.$transaction(async (tx) => {
    const currentPurchase = await tx.topUpPurchase.findUnique({
      where: { id: purchase.id },
      include: { balanceTransaction: true }
    });

    if (!currentPurchase) {
      throw new Error("Purchase disappeared before balance credit.");
    }

    if (currentPurchase.status === TopUpPurchaseStatus.CREDITED && currentPurchase.balanceTransaction) {
      return currentPurchase;
    }

    const balance = await getOrCreateUserBalance(userId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + currentPurchase.creditsUsdMicros;
    const now = new Date();

    await tx.userBalance.update({
      where: { userId },
      data: { balanceUsdMicros: balanceAfterUsdMicros }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId,
        type: BalanceTransactionType.CREDIT,
        amountUsdMicros: currentPurchase.creditsUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        topUpPurchaseId: currentPurchase.id,
        reason: `paypal_topup:${currentPurchase.packageId}`
      }
    });

    await tx.topUpPurchase.update({
      where: { id: currentPurchase.id },
      data: {
        providerPaymentId: captureId,
        status: TopUpPurchaseStatus.CREDITED,
        creditedAt: now,
        notes: "paypal_payment_captured"
      }
    });

    await processReferralCommission(
      userId,
      currentPurchase.creditsUsdMicros,
      transaction.id
    );

    return tx.topUpPurchase.findUniqueOrThrow({
      where: { id: currentPurchase.id },
      include: { balanceTransaction: true }
    });
  });

  return { ok: true as const, purchase: creditedPurchase, credited: true as const };
}
