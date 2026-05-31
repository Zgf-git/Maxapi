import { PaymentProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleAlipayWebhook } from "@/lib/payments/alipay";
import { handlePayPalWebhookEvent, verifyPayPalWebhookSignature } from "@/lib/payments/paypal";
import { getActiveAlipayRuntime, getActivePayPalRuntime, getActiveWeChatRuntime } from "@/lib/payments/provider-instances";
import { handleWeChatWebhook } from "@/lib/payments/wechat";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function parseProvider(value: string) {
  const normalized = value.trim().toUpperCase();
  return Object.values(PaymentProvider).includes(normalized as PaymentProvider)
    ? (normalized as PaymentProvider)
    : null;
}

function sanitizeWebhookError(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unhandled payment webhook error.";
}

function topUpPurchaseIdFromPayPalEvent(event: {
  resource?: {
    custom_id?: string;
    invoice_id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}) {
  const orderId =
    event.resource?.supplementary_data?.related_ids?.order_id ??
    event.resource?.custom_id ??
    event.resource?.invoice_id ??
    null;

  if (!orderId) {
    return null;
  }

  return db.topUpPurchase
    .findFirst({
      where: {
        providerOrderId: orderId,
        paymentProvider: PaymentProvider.PAYPAL
      },
      select: {
        id: true
      }
    })
    .then((purchase) => purchase?.id ?? null);
}

async function handlePayPalWebhook(request: Request) {
  const runtime = await getActivePayPalRuntime();
  if (!runtime || !runtime.config.webhookId) {
    return NextResponse.json(
      { error: { code: "paypal_not_configured", message: "PayPal webhook is not configured." } },
      { status: 503 }
    );
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return NextResponse.json(
      { error: { code: "missing_signature", message: "Missing PayPal webhook signature headers." } },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const isValid = await verifyPayPalWebhookSignature({
    transmissionId,
    transmissionTime,
    transmissionSig,
    certUrl,
    authAlgo,
    rawEvent: rawBody,
    runtimeConfig: runtime.config
  }).catch((error) => {
    if (error instanceof Error && error.message.includes("PAYPAL_WEBHOOK_ID")) {
      return null;
    }

    throw error;
  });

  if (isValid === null) {
    return NextResponse.json(
      { error: { code: "paypal_not_configured", message: "PayPal webhook is not configured." } },
      { status: 503 }
    );
  }

  if (!isValid) {
    return NextResponse.json(
      { error: { code: "invalid_signature", message: "Invalid PayPal webhook signature." } },
      { status: 400 }
    );
  }

  let event: { id: string; event_type: string; resource?: object };

  try {
    event = JSON.parse(rawBody) as { id: string; event_type: string; resource?: object };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_payload", message: "Invalid PayPal webhook payload." } },
      { status: 400 }
    );
  }

  if (!event.id || !event.event_type) {
    return NextResponse.json(
      { error: { code: "invalid_payload", message: "PayPal webhook payload is missing required fields." } },
      { status: 400 }
    );
  }

  const topUpPurchaseId = await topUpPurchaseIdFromPayPalEvent(event);

  await db.paymentWebhookEvent.upsert({
    where: {
      id: event.id
    },
    create: {
      id: event.id,
      provider: PaymentProvider.PAYPAL,
      eventType: event.event_type,
      topUpPurchaseId,
      status: "RECEIVED"
    },
    update: {
      provider: PaymentProvider.PAYPAL,
      eventType: event.event_type,
      topUpPurchaseId,
      status: "RECEIVED",
      errorMessage: null,
      processedAt: null
    }
  });

  try {
    await handlePayPalWebhookEvent(event);

    await db.paymentWebhookEvent.update({
      where: {
        id: event.id
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null
      }
    });
  } catch (error) {
    await db.paymentWebhookEvent.update({
      where: {
        id: event.id
      },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        errorMessage: sanitizeWebhookError(error)
      }
    });

    throw error;
  }

  return NextResponse.json({
    received: true
  });
}

async function handleAlipayProviderWebhook(request: Request) {
  const runtime = await getActiveAlipayRuntime();
  if (!runtime) {
    return NextResponse.json(
      { error: { code: "invalid_alipay_webhook", message: "Alipay webhook is not configured." } },
      { status: 503 }
    );
  }
  const rawBody = await request.text();
  const result = await handleAlipayWebhook(rawBody, runtime.config);

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "invalid_alipay_webhook", message: result.error } },
      { status: result.status }
    );
  }

  if ("ignored" in result) {
    return new Response("success", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  await db.paymentWebhookEvent.upsert({
    where: {
      id: result.eventId
    },
    create: {
      id: result.eventId,
      provider: PaymentProvider.ALIPAY,
      eventType: result.eventType,
      topUpPurchaseId: result.purchaseId,
      status: "PROCESSED",
      processedAt: new Date()
    },
    update: {
      provider: PaymentProvider.ALIPAY,
      eventType: result.eventType,
      topUpPurchaseId: result.purchaseId,
      status: "PROCESSED",
      processedAt: new Date(),
      errorMessage: null
    }
  });

  return new Response(result.body, {
    status: result.status,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function handleWeChatProviderWebhook(request: Request) {
  const runtime = await getActiveWeChatRuntime();
  if (!runtime) {
    return NextResponse.json(
      { error: { code: "invalid_wechat_webhook", message: "WeChat Pay webhook is not configured." } },
      { status: 503 }
    );
  }
  const rawBody = await request.text();
  const result = await handleWeChatWebhook(rawBody, request.headers, runtime.config);

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "invalid_wechat_webhook", message: result.error } },
      { status: result.status }
    );
  }

  if ("ignored" in result) {
    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  }

  await db.paymentWebhookEvent.upsert({
    where: {
      id: result.eventId
    },
    create: {
      id: result.eventId,
      provider: PaymentProvider.WECHAT,
      eventType: result.eventType,
      topUpPurchaseId: result.purchaseId,
      status: "PROCESSED",
      processedAt: new Date()
    },
    update: {
      provider: PaymentProvider.WECHAT,
      eventType: result.eventType,
      topUpPurchaseId: result.purchaseId,
      status: "PROCESSED",
      processedAt: new Date(),
      errorMessage: null
    }
  });

  return NextResponse.json({ code: "SUCCESS", message: "成功" });
}

export async function POST(request: Request, context: RouteContext) {
  const { provider: rawProvider } = await context.params;
  const provider = parseProvider(rawProvider);

  if (!provider) {
    return NextResponse.json(
      { error: { code: "invalid_provider", message: "Unknown payment provider." } },
      { status: 400 }
    );
  }

  if (provider === PaymentProvider.PAYPAL) {
    return handlePayPalWebhook(request);
  }

  if (provider === PaymentProvider.ALIPAY) {
    return handleAlipayProviderWebhook(request);
  }

  if (provider === PaymentProvider.WECHAT) {
    return handleWeChatProviderWebhook(request);
  }

  return NextResponse.json(
    {
      error: {
        code: "invalid_provider",
        message: "Unknown payment provider."
      }
    },
    { status: 400 }
  );
}
