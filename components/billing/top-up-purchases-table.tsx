"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import type { BillingTopUpPurchaseRow } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

function formatPurchaseStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function TopUpPurchasesTable({ rows }: { rows: BillingTopUpPurchaseRow[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const statuses = useMemo(
    () => ["ALL", ...new Set(rows.map((row) => row.status))],
    [rows]
  );
  const filteredRows = useMemo(
    () => rows.filter((row) => statusFilter === "ALL" || row.status === statusFilter),
    [rows, statusFilter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent top-up orders</CardTitle>
        <CardDescription>Recent PayPal, Alipay, or WeChat top-up orders, credited amounts, and refund progress for this account.</CardDescription>
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-3">
            {statuses.map((status) => (
              <Button
                className="h-8 rounded-full px-3 text-xs"
                key={status}
                onClick={() => setStatusFilter(status)}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
              >
                {status === "ALL" ? "All orders" : formatPurchaseStatus(status)}
              </Button>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            title="No top-up orders"
            description="No top-up orders exist yet for this account."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No orders in this status"
            description="Try another top-up order status filter."
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Credits</th>
                <th className="px-3 py-3">Refunded</th>
                <th className="px-3 py-3">Credited at</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className="border-t align-top" key={row.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-3">{row.packageId}</td>
                  <td className="px-3 py-3">{row.paymentProvider}</td>
                  <td className="px-3 py-3 capitalize">{formatPurchaseStatus(row.status)}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.creditsUsdMicros)}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.refundedUsdMicros)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(row.creditedAt)}</td>
                  <td className="px-3 py-3">{row.notes ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">View</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{row.packageId}</DialogTitle>
                          <DialogDescription>Top-up order details and linked payment provider metadata.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                          <div><span className="text-slate-500">Order ID</span><div className="mt-1 break-all text-slate-100">{row.id}</div></div>
                          <div><span className="text-slate-500">Provider</span><div className="mt-1 text-slate-100">{row.paymentProvider}</div></div>
                          <div><span className="text-slate-500">Status</span><div className="mt-1 text-slate-100">{formatPurchaseStatus(row.status)}</div></div>
                          <div><span className="text-slate-500">Credits</span><div className="mt-1 text-slate-100">{formatUsdMicros(row.creditsUsdMicros)}</div></div>
                          <div><span className="text-slate-500">Refunded</span><div className="mt-1 text-slate-100">{formatUsdMicros(row.refundedUsdMicros)}</div></div>
                          <div><span className="text-slate-500">Created</span><div className="mt-1 text-slate-100">{formatDateTime(row.createdAt)}</div></div>
                          <div><span className="text-slate-500">Credited at</span><div className="mt-1 text-slate-100">{formatDateTime(row.creditedAt)}</div></div>
                          <div><span className="text-slate-500">Refunded at</span><div className="mt-1 text-slate-100">{formatDateTime(row.refundedAt)}</div></div>
                          <div><span className="text-slate-500">Provider order</span><div className="mt-1 break-all text-slate-100">{row.providerOrderId ?? "—"}</div></div>
                          <div className="sm:col-span-2"><span className="text-slate-500">Provider payment</span><div className="mt-1 break-all text-slate-100">{row.providerPaymentId ?? "—"}</div></div>
                          <div className="sm:col-span-2"><span className="text-slate-500">Last provider event</span><div className="mt-1 break-all text-slate-100">{row.providerEventIdLastProcessed ?? "—"}</div></div>
                          <div className="sm:col-span-2"><span className="text-slate-500">Notes</span><div className="mt-1 text-slate-100">{row.notes ?? "—"}</div></div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
