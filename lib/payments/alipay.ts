import { PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";
import { createSign, createVerify } from "node:crypto";

import { env } from "@/lib/env";
import { creditTopUpPurchase, findProviderPurchaseByOrderId, markProviderPurchaseState, paymentPublicBaseUrl, usdCentsToCnyFen } from "@/lib/payments/common";
import type { AlipayRuntimeConfig } from "@/lib/payments/provider-instances";
import type { TopUpPackage } from "@/lib/payments/topup-packages";

function normalizePem(value: string, type: "PRIVATE KEY" | "PUBLIC KEY") {
  const trimmed = value.trim();

  if (trimmed.includes("BEGIN")) {
    return trimmed;
  }

  const body = trimmed.replace(/\s+/g, "");
  return `-----BEGIN ${type}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END ${type}-----`;
}

function alipayCharset() {
  return "utf-8";
}

function signParams(params: Record<string, string>, config: AlipayRuntimeConfig) {
  const content = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "" && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signer = createSign("RSA-SHA256");
  signer.update(content, "utf8");
  signer.end();
  return signer.sign(normalizePem(config.privateKey, "PRIVATE KEY"), "base64");
}

function verifyParams(params: Record<string, string>, config: AlipayRuntimeConfig) {
  const sign = params.sign;

  if (!sign) {
    return false;
  }

  const payload = { ...params };
  delete payload.sign;
  delete payload.sign_type;

  const content = Object.keys(payload)
    .filter((key) => payload[key] !== "" && payload[key] !== undefined)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join("&");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(content, "utf8");
  verifier.end();
  return verifier.verify(normalizePem(config.publicKey, "PUBLIC KEY"), sign, "base64");
}

export function buildAlipayCheckoutUrl(input: {
  purchaseId: string;
  topUpPackage: TopUpPackage;
  runtimeConfig: AlipayRuntimeConfig;
}) {
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const totalAmount = (usdCentsToCnyFen(input.topUpPackage.amountUsdCents) / 100).toFixed(2);
  const params: Record<string, string> = {
    app_id: input.runtimeConfig.appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: alipayCharset(),
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: `${paymentPublicBaseUrl()}/api/payments/webhook/alipay`,
    return_url: `${env.APP_BASE_URL}/dashboard/billing/success?purchase_id=${input.purchaseId}&provider=alipay`,
    biz_content: JSON.stringify({
      out_trade_no: input.purchaseId,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: totalAmount,
      subject: `MaxAPI ${input.topUpPackage.label}`,
      body: input.topUpPackage.description
    })
  };

  const sign = signParams(params, input.runtimeConfig);
  const url = new URL(input.runtimeConfig.gatewayUrl ?? env.ALIPAY_GATEWAY_URL);
  Object.entries({ ...params, sign }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    totalAmountCnyFen: usdCentsToCnyFen(input.topUpPackage.amountUsdCents)
  };
}

export async function handleAlipayWebhook(body: string, runtimeConfig: AlipayRuntimeConfig) {
  const raw = new URLSearchParams(body);
  const params = Object.fromEntries(raw.entries());

  if (!verifyParams(params, runtimeConfig)) {
    return { ok: false as const, status: 400, error: "Invalid Alipay signature." };
  }

  const outTradeNo = params.out_trade_no;
  const tradeNo = params.trade_no ?? null;
  const notifyId = params.notify_id ?? `${outTradeNo}:${params.trade_status ?? "unknown"}`;
  const tradeStatus = params.trade_status ?? "";
  const totalAmount = Number(params.total_amount ?? "0");

  if (!outTradeNo) {
    return { ok: true as const, ignored: true as const };
  }

  const purchase = await findProviderPurchaseByOrderId(PaymentProvider.ALIPAY, outTradeNo);
  if (!purchase) {
    return { ok: true as const, ignored: true as const };
  }

  const expectedAmount = (usdCentsToCnyFen(purchase.amountUsdCents) / 100).toFixed(2);
  if (Number(expectedAmount) !== totalAmount) {
    await markProviderPurchaseState({
      provider: PaymentProvider.ALIPAY,
      providerOrderId: outTradeNo,
      status: TopUpPurchaseStatus.FAILED,
      providerEventId: notifyId,
      providerPaymentId: tradeNo,
      notes: `alipay_amount_mismatch:${params.total_amount}`
    });

    return { ok: false as const, status: 400, error: "Alipay amount mismatch." };
  }

  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    await creditTopUpPurchase({
      purchaseId: purchase.id,
      providerPaymentId: tradeNo,
      providerEventId: notifyId,
      notes: "alipay_trade_success"
    });

    return { ok: true as const, status: 200, body: "success", eventId: notifyId, purchaseId: purchase.id, eventType: tradeStatus };
  }

  if (tradeStatus === "WAIT_BUYER_PAY") {
    await markProviderPurchaseState({
      provider: PaymentProvider.ALIPAY,
      providerOrderId: outTradeNo,
      status: TopUpPurchaseStatus.COMPLETED,
      providerEventId: notifyId,
      providerPaymentId: tradeNo,
      notes: "alipay_wait_buyer_pay"
    });

    return { ok: true as const, status: 200, body: "success", eventId: notifyId, purchaseId: purchase.id, eventType: tradeStatus };
  }

  await markProviderPurchaseState({
    provider: PaymentProvider.ALIPAY,
    providerOrderId: outTradeNo,
    status: TopUpPurchaseStatus.FAILED,
    providerEventId: notifyId,
    providerPaymentId: tradeNo,
    notes: `alipay_${tradeStatus.toLowerCase() || "unknown"}`
  });

  return { ok: true as const, status: 200, body: "success", eventId: notifyId, purchaseId: purchase.id, eventType: tradeStatus };
}
