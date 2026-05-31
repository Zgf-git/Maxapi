import { BalanceTransactionType, PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { PayPalRuntimeConfig } from "@/lib/payments/provider-instances";
import { processReferralCommission } from "@/lib/referral/service";

type PayPalAccessTokenResponse = {
  access_token: string;
};

type PayPalVerifyWebhookResponse = {
  verification_status?: string;
};

type PayPalLink = {
  rel?: string;
  href?: string;
};

type PayPalOrderCreateResponse = {
  id?: string;
  links?: PayPalLink[];
  message?: string;
};

type PayPalCaptureResponse = {
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
      }>;
    };
  }>;
  message?: string;
};

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: {
      value?: string;
      currency_code?: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
};

function paypalApiBaseUrl() {
  return env.PAYPAL_SANDBOX
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function paypalBasicAuth(config: PayPalRuntimeConfig) {
  return Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
}

export async function getPayPalAccessToken(config: PayPalRuntimeConfig) {
  const response = await fetch(`${paypalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${paypalBasicAuth(config)}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PayPalAccessTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error("Could not obtain PayPal access token.");
  }

  return payload.access_token;
}

export async function createPayPalOrder(input: {
  purchaseId: string;
  packageLabel: string;
  description: string;
  amountUsdCents: number;
  runtimeConfig: PayPalRuntimeConfig;
}) {
  const accessToken = await getPayPalAccessToken(input.runtimeConfig);
  const response = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.purchaseId,
          custom_id: input.purchaseId,
          description: `MaxAPI ${input.packageLabel}`,
          amount: {
            currency_code: "USD",
            value: (input.amountUsdCents / 100).toFixed(2)
          }
        }
      ],
      application_context: {
        brand_name: "MaxAPI",
        user_action: "PAY_NOW",
        return_url: `${env.APP_BASE_URL}/dashboard/billing/success?purchase_id=${input.purchaseId}&provider=paypal`,
        cancel_url: `${env.APP_BASE_URL}/dashboard/billing/cancel?purchase_id=${input.purchaseId}&provider=paypal`
      }
    }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PayPalOrderCreateResponse | null;
  return { response, payload };
}

export async function capturePayPalOrder(orderId: string) {
  throw new Error(`capturePayPalOrder requires runtime configuration: ${orderId}`);
}

export async function capturePayPalOrderWithConfig(orderId: string, runtimeConfig: PayPalRuntimeConfig) {
  const accessToken = await getPayPalAccessToken(runtimeConfig);
  const response = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    cache: "no-store"
  });
  const payload = (await response.json().catch(() => null)) as PayPalCaptureResponse | null;
  return { response, payload };
}

export async function verifyPayPalWebhookSignature(input: {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
  rawEvent: string;
  runtimeConfig: PayPalRuntimeConfig;
}) {
  if (!input.runtimeConfig.webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const accessToken = await getPayPalAccessToken(input.runtimeConfig);
  const parsedEvent = JSON.parse(input.rawEvent);
  const response = await fetch(`${paypalApiBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      auth_algo: input.authAlgo,
      cert_url: input.certUrl,
      transmission_id: input.transmissionId,
      transmission_sig: input.transmissionSig,
      transmission_time: input.transmissionTime,
      webhook_id: input.runtimeConfig.webhookId,
      webhook_event: parsedEvent
    }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PayPalVerifyWebhookResponse | null;

  return response.ok && payload?.verification_status === "SUCCESS";
}

function eventOrderId(event: PayPalWebhookEvent) {
  return (
    event.resource?.supplementary_data?.related_ids?.order_id ??
    event.resource?.custom_id ??
    event.resource?.invoice_id ??
    null
  );
}

function eventCaptureId(event: PayPalWebhookEvent) {
  return event.resource?.id ?? null;
}

function parseEventAmountUsdCents(event: PayPalWebhookEvent) {
  const amount = event.resource?.amount?.value;
  const currency = event.resource?.amount?.currency_code;

  if (!amount || currency !== "USD") {
    return null;
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

async function creditPayPalPurchaseByOrderId(input: {
  orderId: string;
  captureId: string | null;
  eventId: string;
  expectedAmountUsdCents: number | null;
}) {
  const purchase = await db.topUpPurchase.findFirst({
    where: {
      providerOrderId: input.orderId,
      paymentProvider: PaymentProvider.PAYPAL
    },
    include: {
      balanceTransaction: true
    }
  });

  if (!purchase) {
    return { ok: true as const, ignored: true as const, reason: "No purchase matched PayPal order ID." };
  }

  if (purchase.status === TopUpPurchaseStatus.CREDITED && purchase.balanceTransaction) {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        providerEventIdLastProcessed: input.eventId,
        providerPaymentId: input.captureId ?? purchase.providerPaymentId
      }
    });

    return { ok: true as const, credited: false as const };
  }

  if (
    input.expectedAmountUsdCents !== null &&
    input.expectedAmountUsdCents !== purchase.amountUsdCents
  ) {
    await db.topUpPurchase.update({
      where: { id: purchase.id },
      data: {
        status: TopUpPurchaseStatus.FAILED,
        providerEventIdLastProcessed: input.eventId,
        notes: `paypal_amount_mismatch:${input.expectedAmountUsdCents}`
      }
    });

    return { ok: false as const, error: "PayPal amount mismatch." };
  }

  await db.$transaction(async (tx) => {
    const currentPurchase = await tx.topUpPurchase.findUnique({
      where: { id: purchase.id },
      include: { balanceTransaction: true }
    });

    if (!currentPurchase) {
      throw new Error("Purchase disappeared before webhook credit.");
    }

    if (currentPurchase.status === TopUpPurchaseStatus.CREDITED && currentPurchase.balanceTransaction) {
      return;
    }

    const balance = await getOrCreateUserBalance(currentPurchase.userId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + currentPurchase.creditsUsdMicros;
    const now = new Date();

    await tx.userBalance.update({
      where: { userId: currentPurchase.userId },
      data: { balanceUsdMicros: balanceAfterUsdMicros }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId: currentPurchase.userId,
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
        providerPaymentId: input.captureId,
        providerEventIdLastProcessed: input.eventId,
        status: TopUpPurchaseStatus.CREDITED,
        creditedAt: now,
        notes: "paypal_webhook_capture_completed"
      }
    });

    await processReferralCommission(
      currentPurchase.userId,
      currentPurchase.creditsUsdMicros,
      transaction.id
    );
  });

  return { ok: true as const, credited: true as const };
}

async function markPayPalPurchaseStateByOrderId(input: {
  orderId: string;
  eventId: string;
  status: TopUpPurchaseStatus;
  notes: string;
}) {
  const purchase = await db.topUpPurchase.findFirst({
    where: {
      providerOrderId: input.orderId,
      paymentProvider: PaymentProvider.PAYPAL
    }
  });

  if (!purchase || purchase.status === TopUpPurchaseStatus.CREDITED) {
    return { ok: true as const };
  }

  await db.topUpPurchase.update({
    where: { id: purchase.id },
    data: {
      status: input.status,
      providerEventIdLastProcessed: input.eventId,
      notes: input.notes
    }
  });

  return { ok: true as const };
}

export async function handlePayPalWebhookEvent(event: PayPalWebhookEvent) {
  const orderId = eventOrderId(event);

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      if (!orderId) {
        return { ok: true as const, ignored: true as const, reason: "No PayPal order ID in completed event." };
      }
      return creditPayPalPurchaseByOrderId({
        orderId,
        captureId: eventCaptureId(event),
        eventId: event.id,
        expectedAmountUsdCents: parseEventAmountUsdCents(event)
      });
    case "PAYMENT.CAPTURE.DENIED":
      return orderId
        ? markPayPalPurchaseStateByOrderId({
            orderId,
            eventId: event.id,
            status: TopUpPurchaseStatus.FAILED,
            notes: "paypal_capture_denied"
          })
        : { ok: true as const, ignored: true as const, reason: "No PayPal order ID in denied event." };
    case "PAYMENT.CAPTURE.PENDING":
      return orderId
        ? markPayPalPurchaseStateByOrderId({
            orderId,
            eventId: event.id,
            status: TopUpPurchaseStatus.COMPLETED,
            notes: "paypal_capture_pending"
          })
        : { ok: true as const, ignored: true as const, reason: "No PayPal order ID in pending event." };
    case "CHECKOUT.PAYMENT-APPROVAL.REVERSED":
    case "PAYMENT.CAPTURE.REVERSED":
      return orderId
        ? markPayPalPurchaseStateByOrderId({
            orderId,
            eventId: event.id,
            status: TopUpPurchaseStatus.FAILED,
            notes: "paypal_capture_reversed"
          })
        : { ok: true as const, ignored: true as const, reason: "No PayPal order ID in reversed event." };
    default:
      return { ok: true as const, ignored: true as const, reason: `Unhandled PayPal event: ${event.event_type}` };
  }
}
