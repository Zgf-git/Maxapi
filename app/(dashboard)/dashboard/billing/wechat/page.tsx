import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export default async function WeChatBillingPage({
  searchParams
}: {
  searchParams: Promise<{ purchase_id?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;

  const purchase = params.purchase_id
    ? await db.topUpPurchase.findFirst({
        where: {
          id: params.purchase_id,
          userId: user.id
        }
      })
    : null;

  const providerMetadata =
    purchase && purchase.providerMetadata && typeof purchase.providerMetadata === "object"
      ? (purchase.providerMetadata as { codeUrl?: string; chargeAmountFen?: number })
      : null;
  const codeUrl = providerMetadata?.codeUrl;
  const qrCodeDataUrl = codeUrl
    ? await QRCode.toDataURL(codeUrl, {
        width: 280,
        margin: 1
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Billing"
        title="微信扫码支付"
        description="请使用微信扫描二维码为当前账号充值。支付成功后，余额会在微信异步回调确认后自动到账。"
      />
      <Card>
        <CardHeader>
          <CardTitle>支付信息</CardTitle>
          <CardDescription>保留本页，支付完成后刷新即可查看最新状态。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchase ? (
            <div className="rounded-3xl border bg-[var(--color-secondary)]/60 p-4 text-sm text-[var(--color-muted-foreground)]">
              <p>状态: <span className="font-medium text-[var(--color-foreground)]">{purchase.status}</span></p>
              <p>套餐: {purchase.packageId}</p>
              <p>充值额度: {formatUsdMicros(purchase.creditsUsdMicros)}</p>
              <p>创建时间: {formatDateTime(purchase.createdAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">未找到对应的微信支付订单。</p>
          )}

          {qrCodeDataUrl ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border bg-white p-6 text-slate-900">
              <Image alt="WeChat Pay QR code" height={280} src={qrCodeDataUrl} width={280} />
              <p className="text-sm text-slate-600">请使用微信扫一扫完成支付。</p>
            </div>
          ) : (
            <div className="rounded-3xl border bg-[var(--color-secondary)]/60 p-4 text-sm text-[var(--color-muted-foreground)]">
              当前订单还没有可用的微信支付二维码，请返回账单页重新创建一次订单。
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/dashboard/billing/wechat?purchase_id=${params.purchase_id ?? ""}`}>刷新状态</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/billing">返回账单</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
