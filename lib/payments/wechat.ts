import { PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";
import { createDecipheriv, createSign, createVerify, randomUUID } from "node:crypto";

import { env } from "@/lib/env";
import { creditTopUpPurchase, findProviderPurchaseByOrderId, markProviderPurchaseState, paymentPublicBaseUrl, usdCentsToCnyFen } from "@/lib/payments/common";
import type { WeChatRuntimeConfig } from "@/lib/payments/provider-instances";
import type { TopUpPackage } from "@/lib/payments/topup-packages";

const WECHAT_API_BASE = "https://api.mch.weixin.qq.com";

function normalizePem(value: string, type: "PRIVATE KEY" | "PUBLIC KEY") {
  const trimmed = value.trim();

  if (trimmed.includes("BEGIN")) {
    return trimmed;
  }

  const body = trimmed.replace(/\s+/g, "");
  return `-----BEGIN ${type}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END ${type}-----`;
}

function signWeChatMessage(message: string, runtimeConfig: WeChatRuntimeConfig) {
  const signer = createSign("RSA-SHA256");
  signer.update(message, "utf8");
  signer.end();
  return signer.sign(normalizePem(runtimeConfig.privateKey, "PRIVATE KEY"), "base64");
}

function buildWeChatAuthorization(method: string, urlPath: string, body: string, runtimeConfig: WeChatRuntimeConfig) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID().replace(/-/g, "");
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signWeChatMessage(message, runtimeConfig);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${runtimeConfig.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${runtimeConfig.certSerialNo}"`;
}

export async function createWeChatNativeOrder(input: {
  purchaseId: string;
  topUpPackage: TopUpPackage;
  runtimeConfig: WeChatRuntimeConfig;
}) {
  const amountFen = usdCentsToCnyFen(input.topUpPackage.amountUsdCents);
  const urlPath = "/v3/pay/transactions/native";
  const body = JSON.stringify({
    appid: input.runtimeConfig.appId,
    mchid: input.runtimeConfig.mchId,
    description: `MaxAPI ${input.topUpPackage.label}`,
    out_trade_no: input.purchaseId,
    notify_url: `${paymentPublicBaseUrl()}/api/payments/webhook/wechat`,
    amount: {
      total: amountFen,
      currency: "CNY"
    }
  });

  const response = await fetch(`${WECHAT_API_BASE}${urlPath}`, {
    method: "POST",
    headers: {
      authorization: buildWeChatAuthorization("POST", urlPath, body, input.runtimeConfig),
      accept: "application/json",
      "content-type": "application/json"
    },
    body,
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);
  return {
    response,
    payload,
    amountFen
  };
}

function verifyWeChatCallbackSignature(input: {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
  runtimeConfig: WeChatRuntimeConfig;
}) {
  const message = `${input.timestamp}\n${input.nonce}\n${input.body}\n`;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(message, "utf8");
  verifier.end();
  return verifier.verify(
    normalizePem(input.runtimeConfig.platformPublicKey, "PUBLIC KEY"),
    input.signature,
    "base64"
  );
}

function decryptWeChatResource(input: {
  associatedData: string;
  nonce: string;
  ciphertext: string;
  runtimeConfig: WeChatRuntimeConfig;
}) {
  const key = Buffer.from(input.runtimeConfig.apiV3Key, "utf8");
  const decoded = Buffer.from(input.ciphertext, "base64");
  const authTag = decoded.subarray(decoded.length - 16);
  const ciphertext = decoded.subarray(0, decoded.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(input.nonce, "utf8"));
  decipher.setAAD(Buffer.from(input.associatedData, "utf8"));
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export async function handleWeChatWebhook(body: string, headers: Headers, runtimeConfig: WeChatRuntimeConfig) {
  const signature = headers.get("wechatpay-signature");
  const timestamp = headers.get("wechatpay-timestamp");
  const nonce = headers.get("wechatpay-nonce");

  if (!signature || !timestamp || !nonce) {
    return { ok: false as const, status: 400, error: "Missing WeChat Pay signature headers." };
  }

  if (!verifyWeChatCallbackSignature({ timestamp, nonce, body, signature, runtimeConfig })) {
    return { ok: false as const, status: 400, error: "Invalid WeChat Pay signature." };
  }

  const event = JSON.parse(body) as {
    id: string;
    event_type: string;
    resource: {
      associated_data: string;
      nonce: string;
      ciphertext: string;
    };
  };

  const resource = JSON.parse(
    decryptWeChatResource({
      associatedData: event.resource.associated_data,
      nonce: event.resource.nonce,
      ciphertext: event.resource.ciphertext,
      runtimeConfig
    })
  ) as {
    out_trade_no?: string;
    transaction_id?: string;
    trade_state?: string;
    amount?: { total?: number; currency?: string };
  };

  const outTradeNo = resource.out_trade_no;
  if (!outTradeNo) {
    return { ok: true as const, ignored: true as const };
  }

  const purchase = await findProviderPurchaseByOrderId(PaymentProvider.WECHAT, outTradeNo);
  if (!purchase) {
    return { ok: true as const, ignored: true as const };
  }

  const expectedFen = usdCentsToCnyFen(purchase.amountUsdCents);
  if (resource.amount?.currency !== "CNY" || resource.amount?.total !== expectedFen) {
    await markProviderPurchaseState({
      provider: PaymentProvider.WECHAT,
      providerOrderId: outTradeNo,
      status: TopUpPurchaseStatus.FAILED,
      providerEventId: event.id,
      providerPaymentId: resource.transaction_id,
      notes: `wechat_amount_mismatch:${resource.amount?.total ?? "unknown"}`
    });

    return { ok: false as const, status: 400, error: "WeChat Pay amount mismatch." };
  }

  if (resource.trade_state === "SUCCESS") {
    await creditTopUpPurchase({
      purchaseId: purchase.id,
      providerPaymentId: resource.transaction_id,
      providerEventId: event.id,
      notes: "wechat_trade_success"
    });

    return { ok: true as const, status: 200, eventId: event.id, purchaseId: purchase.id, eventType: event.event_type };
  }

  await markProviderPurchaseState({
    provider: PaymentProvider.WECHAT,
    providerOrderId: outTradeNo,
    status: TopUpPurchaseStatus.FAILED,
    providerEventId: event.id,
    providerPaymentId: resource.transaction_id,
    notes: `wechat_${resource.trade_state?.toLowerCase() ?? "unknown"}`
  });

  return { ok: true as const, status: 200, eventId: event.id, purchaseId: purchase.id, eventType: event.event_type };
}
