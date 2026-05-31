import { PaymentProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { getActionUser } from "@/lib/auth/session";
import { createUnifiedTopUpCheckoutSession } from "@/lib/payments/gateway";

function parseProvider(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return Object.values(PaymentProvider).includes(normalized as PaymentProvider)
    ? (normalized as PaymentProvider)
    : null;
}

export async function POST(request: Request) {
  const user = await getActionUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Please sign in to continue." } },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const packageId =
    typeof body === "object" && body !== null && "packageId" in body
      ? String(body.packageId)
      : "";
  const provider =
    typeof body === "object" && body !== null && "provider" in body
      ? parseProvider(body.provider)
      : null;

  if (!provider) {
    return NextResponse.json(
      { error: { code: "invalid_provider", message: "Unknown payment provider." } },
      { status: 400 }
    );
  }

  const result = await createUnifiedTopUpCheckoutSession({
    userId: user.id,
    packageId,
    provider
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.status === 503 ? "payment_provider_not_configured" : "invalid_request", message: result.error } },
      { status: result.status }
    );
  }

  return NextResponse.json({
    url: result.checkoutUrl,
    topUpPurchaseId: result.topUpPurchaseId
  });
}
