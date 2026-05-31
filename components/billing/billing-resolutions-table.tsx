"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingResolutionRow } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export function BillingResolutionsTable({ rows }: { rows: BillingResolutionRow[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const types = useMemo(() => ["ALL", ...new Set(rows.map((row) => row.type))], [rows]);
  const statuses = useMemo(() => ["ALL", ...new Set(rows.map((row) => row.status))], [rows]);
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (typeFilter === "ALL" || row.type === typeFilter) &&
          (statusFilter === "ALL" || row.status === statusFilter)
      ),
    [rows, typeFilter, statusFilter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refunds and compensations</CardTitle>
        <CardDescription>Operator-applied refunds, goodwill credits, and billing corrections linked to your account.</CardDescription>
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-3">
            {types.map((type) => (
              <Button
                className="h-8 rounded-full px-3 text-xs"
                key={`type-${type}`}
                onClick={() => setTypeFilter(type)}
                size="sm"
                variant={typeFilter === type ? "default" : "outline"}
              >
                {type === "ALL" ? "All types" : type}
              </Button>
            ))}
            {statuses.map((status) => (
              <Button
                className="h-8 rounded-full px-3 text-xs"
                key={`status-${status}`}
                onClick={() => setStatusFilter(status)}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
              >
                {status === "ALL" ? "All states" : status}
              </Button>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            title="No billing resolutions"
            description="No refunds or compensation records exist yet for this account."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No matching billing records"
            description="Try another resolution type or status filter."
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Top-up</th>
                <th className="px-3 py-3">Refund reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className="border-t align-top" key={row.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-3">{row.type}</td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.amountUsdMicros)}</td>
                  <td className="px-3 py-3">{row.reason}</td>
                  <td className="px-3 py-3">{row.topUpPurchase?.packageId ?? "—"}</td>
                  <td className="px-3 py-3">{row.providerRefundId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
