import { AlertTriangle, ArrowUpRight } from "lucide-react";

import { TrendAreaChart } from "@/components/internal/ui/area-chart";
import { MetricCard, MetricGrid } from "@/components/internal/ui/metric-card";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { formatUsdMicros } from "@/lib/utils";
import { getRevenueTimeSeries } from "@/lib/internal/finance";
import { getOverviewData } from "@/lib/internal/overview";
import { db } from "@/lib/db";

function microsToNumber(value: bigint): number {
  return Number(value) / 1_000_000;
}

export const metadata = {
  title: "Overview · Internal · MaxAPI"
};

export default async function InternalOverviewPage() {
  const data = await getOverviewData();
  const revenueSeries = await getRevenueTimeSeries(30);
  const providerStats = await db.requestLog.groupBy({
    by: ["provider"],
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    _count: { id: true }
  });
  const total24h = providerStats.reduce((s, p) => s + p._count.id, 0);

  const chartData = revenueSeries.map((d) => ({
    date: d.date.slice(5),
    Revenue: microsToNumber(d.revenue),
    Debits: microsToNumber(d.debits),
    Margin: microsToNumber(d.margin)
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Overview"
        description="Live snapshot of users, traffic, money, and the action queue."
      />

      <MetricGrid>
        <MetricCard
          label="MAU"
          value={data.mau.toLocaleString()}
          delta={
            data.mauDelta !== 0
              ? { value: `${data.mauDelta > 0 ? "+" : ""}${data.mauDelta}%`, direction: data.mauDelta > 0 ? "up" : data.mauDelta < 0 ? "down" : "flat", label: "/ 30d" }
              : undefined
          }
        />
        <MetricCard
          label="Requests · 24h"
          value={data.requests24h.toLocaleString()}
          delta={
            data.requests24hDelta !== 0
              ? { value: `${data.requests24hDelta > 0 ? "+" : ""}${data.requests24hDelta}%`, direction: data.requests24hDelta > 0 ? "up" : data.requests24hDelta < 0 ? "down" : "flat", label: "/ 24h" }
              : undefined
          }
        />
        <MetricCard
          label="Revenue · 24h"
          value={formatUsdMicros(data.revenue24hUsdMicros)}
          delta={
            data.revenue24hDelta !== 0
              ? { value: `${data.revenue24hDelta > 0 ? "+" : ""}${data.revenue24hDelta}%`, direction: data.revenue24hDelta > 0 ? "up" : data.revenue24hDelta < 0 ? "down" : "flat", label: "/ 24h" }
              : undefined
          }
        />
        <MetricCard
          label="Error rate"
          value={`${(data.errorRate24h * 100).toFixed(2)}%`}
          delta={
            data.errorRate24hDelta !== 0
              ? { value: `${data.errorRate24hDelta > 0 ? "+" : ""}${data.errorRate24hDelta}%`, direction: data.errorRate24hDelta > 0 ? "up" : data.errorRate24hDelta < 0 ? "down" : "flat", label: "pts / 24h" }
              : undefined
          }
        />
      </MetricGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Revenue · Cost · Margin · 30d"
          description="Time-series view of money flow"
        >
          <TrendAreaChart
            data={chartData}
            xKey="date"
            series={[
              { key: "Revenue", label: "Revenue", color: "#5be7c4" },
              { key: "Debits", label: "Debits", color: "#70a4ff" },
              { key: "Margin", label: "Margin", color: "#f0e68c" }
            ]}
          />
        </SectionCard>

        <SectionCard title="Action queue" description="Items waiting for an operator">
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
              <span>{data.pendingRefunds} pending refund / compensation cases</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
              <span>{data.unresolvedAbuse} unresolved abuse events</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>{data.pendingReconciliation} top-ups awaiting reconciliation</span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Top providers · 24h" description="Routing distribution by upstream">
        {providerStats.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No requests in the last 24h</div>
        ) : (
          <div className="space-y-2">
            {providerStats
              .sort((a, b) => b._count.id - a._count.id)
              .map((p) => {
                const pct = total24h > 0 ? Math.round((p._count.id / total24h) * 100) : 0;
                return (
                  <div key={p.provider} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-white">{p.provider}</div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-white/8">
                        <div
                          className="h-2 rounded-full bg-cyan-300/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right text-xs text-slate-400">{pct}%</div>
                    <div className="w-16 text-right text-xs tabular-nums text-slate-300">
                      {p._count.id.toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
