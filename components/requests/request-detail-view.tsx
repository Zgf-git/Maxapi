import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { PageHeader } from "@/components/dashboard/page-header";
import { FallbackBadge, ProviderBadge, RequestStatusBadge, RoutePolicyBadge } from "@/components/requests/request-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatUsdMicros, formatWholeNumber } from "@/lib/utils";

type RequestDetail = Prisma.RequestLogGetPayload<{
  include: {
    usageLedgerEntry: {
      include: {
        balanceTransaction: true;
      };
    };
  };
}>;

export function RequestDetailView({ detail }: { detail: RequestDetail }) {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Review routing outcomes, fallback metadata, and billing linkage for a single request."
        eyebrow="Requests"
        title="Request detail"
        actions={
          <Link className="text-sm font-medium underline-offset-2 hover:underline" href="/dashboard/requests">
            Back to requests
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Request metadata</CardTitle>
          <CardDescription>Operational details for this routed request.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Request log id:</span> {detail.id}</p>
            <p><span className="font-medium">Created at:</span> {formatDateTime(detail.createdAt)}</p>
            <p><span className="font-medium">Request type:</span> {detail.requestType}</p>
            <p><span className="font-medium">Requested route policy:</span> <RoutePolicyBadge routePolicy={detail.routePolicy} /></p>
            <p><span className="font-medium">Requested model:</span> {detail.requestedModel ?? "—"}</p>
            <p><span className="font-medium">Actual provider:</span> <ProviderBadge provider={detail.provider} /></p>
            <p><span className="font-medium">Actual upstream model:</span> {detail.upstreamModel ?? "—"}</p>
          </div>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Fallback:</span> <FallbackBadge used={detail.fallbackUsed} /></p>
            <p><span className="font-medium">Fallback from provider:</span> {detail.fallbackFromProvider ?? "—"}</p>
            <p><span className="font-medium">Fallback from model:</span> {detail.fallbackFromModel ?? "—"}</p>
            <p><span className="font-medium">Route reason:</span> {detail.routeReason ?? "—"}</p>
            <p><span className="font-medium">Status:</span> <RequestStatusBadge status={detail.status} /></p>
            <p><span className="font-medium">Latency:</span> {detail.latencyMs ? `${detail.latencyMs} ms` : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage and billing</CardTitle>
          <CardDescription>Linked ledger and balance movement when the request produced billable usage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Total tokens:</span> {formatWholeNumber(detail.totalTokens)}</p>
            <p><span className="font-medium">Prompt tokens:</span> {formatWholeNumber(detail.promptTokens)}</p>
            <p><span className="font-medium">Completion tokens:</span> {formatWholeNumber(detail.completionTokens)}</p>
            <p><span className="font-medium">Ledger id:</span> {detail.usageLedgerEntry?.id ?? "—"}</p>
            <p><span className="font-medium">Ledger status:</span> {detail.usageLedgerEntry?.status ?? "—"}</p>
            <p><span className="font-medium">Total cost:</span> {formatUsdMicros(detail.usageLedgerEntry?.totalCostUsdMicros ?? null)}</p>
          </div>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Pricing version:</span> {detail.usageLedgerEntry?.pricingVersion ?? "—"}</p>
            <p><span className="font-medium">Charged at:</span> {formatDateTime(detail.usageLedgerEntry?.chargedAt ?? null)}</p>
            <p><span className="font-medium">Balance transaction:</span> {detail.usageLedgerEntry?.balanceTransaction?.id ?? "—"}</p>
            <p><span className="font-medium">Balance after:</span> {formatUsdMicros(detail.usageLedgerEntry?.balanceTransaction?.balanceAfterUsdMicros ?? null)}</p>
            <p><span className="font-medium">Journal reason:</span> {detail.usageLedgerEntry?.balanceTransaction?.reason ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sanitized error metadata</CardTitle>
          <CardDescription>Operationally useful failure details without exposing prompts, raw API keys, or provider secrets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-medium">Error code:</span> {detail.errorCode ?? "—"}</p>
          <p><span className="font-medium">Error message:</span> {detail.errorMessage ?? "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
