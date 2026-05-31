import { NextResponse } from "next/server";

import { getActionUser } from "@/lib/auth/session";
import { redeemCode } from "@/lib/redemption/service";

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

  const code =
    body && typeof body === "object" && "code" in body && typeof body.code === "string"
      ? body.code
      : "";

  if (!code.trim()) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Redemption code is required." } },
      { status: 400 }
    );
  }

  const result = await redeemCode({
    userId: user.id,
    code
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "redemption_failed", message: result.error } },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    amountUsdMicros: result.amountUsdMicros.toString(),
    balanceAfterUsdMicros: result.balanceAfterUsdMicros.toString(),
    balanceTransactionId: result.balanceTransactionId
  });
}
