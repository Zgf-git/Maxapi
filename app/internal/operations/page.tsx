import Link from "next/link";

import { TrendAreaChart } from "@/components/internal/ui/area-chart";
import { DataTable } from "@/components/internal/ui/data-table";
import { MetricCard, MetricGrid } from "@/components/internal/ui/metric-card";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import {
  buildOpsFilterHref,
  normalizeOpsFilters
} from "@/lib/ops/filters";
import {
  OPS_FALLBACK_OPTIONS,
  OPS_PROVIDERS,
  OPS_ROUTE_POLICIES,
  OPS_STATUSES,
  OPS_TIME_WINDOWS
} from "@/lib/ops/types";
import { getOpsDashboardData, getRequestTimeSeries } from "@/lib/internal/operations";
import { formatUsdMicros, formatWholeNumber } from "@/lib/utils";

export const metadata = {
  title: "Live · Operations · Internal · MaxAPI"
};

export default async function InternalOperationsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = normalizeOpsFilters(params);
  const [dashboard, timeSeries] = await Promise.all([
    getOpsDashboardData(filters),
    getRequestTimeSeries(filters)
  ]);

  const { summary, providerRows, fallbackRows } = dashboard;

  const chartData = timeSeries.map((p) => ({
    label: p.label,
    Requests: p.requests,
    "Error %": Math.round(p.errorRate * 100),
    "p50 ms": p.p50Latency ?? 0,
    "p95 ms": p.p95Latency ?? 0
  }));

  const filterHref = (overrides: Partial<typeof filters>) => {
    const next = { ...filters, ...overrides };
    return `?${buildOpsFilterHref(next)}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Live"
        description={`${filters.window} window · ${summary.requestCount.toLocaleString()} requests`}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-4">
        <FilterGroup
          label="Window"
          options={[...OPS_TIME_WINDOWS]}
          current={filters.window}
          buildHref={(v) => filterHref({ window: v as any })}
        />
        <FilterGroup
          label="Provider"
          options={["all", ...OPS_PROVIDERS]}
          current={filters.provider ?? "all"}
          buildHref={(v) => filterHref({ provider: v === "all" ? undefined : (v as any) })}
        />
        <FilterGroup
          label="Status"
          options={["all", ...OPS_STATUSES]}
          current={filters.status ?? "all"}
          buildHref={(v) => filterHref({ status: v === "all" ? undefined : (v as any) })}
        />
        <FilterGroup
          label="Fallback"
          options={["all", ...OPS_FALLBACK_OPTIONS]}
          current={filters.fallbackUsed ?? "all"}
          buildHref={(v) =>
            filterHref({ fallbackUsed: v === "all" ? undefined : (v as any) })
          }
        />
        <FilterGroup
          label="Policy"
          options={["all", ...OPS_ROUTE_POLICIES]}
          current={filters.routePolicy ?? "all"}
          buildHref={(v) =>
            filterHref({ routePolicy: v === "all" ? undefined : (v as any) })
          }
        />
      </div>

      <MetricGrid>
        <MetricCard
          label="Requests"
          value={formatWholeNumber(summary.requestCount)}
        />
        <MetricCard
          label="Success rate"
          value={`${(summary.successRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="Fallback rate"
          value={`${(summary.fallbackRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="Usage revenue"
          value={formatUsdMicros(summary.revenueUsdMicros)}
        />
        <MetricCard
          label="Est. upstream cost"
          value={formatUsdMicros(summary.providerCostUsdMicros)}
        />
        <MetricCard
          label="Est. gross margin"
          value={
            summary.grossMarginUsdMicros < 0n
              ? `-${formatUsdMicros(-summary.grossMarginUsdMicros)}`
              : formatUsdMicros(summary.grossMarginUsdMicros)
          }
        />
        <MetricCard
          label="Top failure source"
          value={summary.worstFailureSource ?? "—"}
        />
        <MetricCard
          label="Margin model"
          value="Cost basis"
        />
      </MetricGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Requests" description="Count over time">
          <TrendAreaChart
            data={chartData}
            xKey="label"
            series={[{ key: "Requests", label: "Requests", color: "#5be7c4" }]}
            height={260}
          />
        </SectionCard>

        <SectionCard title="Error rate" description="% of failed requests">
          <TrendAreaChart
            data={chartData}
            xKey="label"
            series={[{ key: "Error %", label: "Error %", color: "#ff6b6b" }]}
            height={260}
          />
        </SectionCard>

        <SectionCard title="Latency" description="p50 and p95">
          <TrendAreaChart
            data={chartData}
            xKey="label"
            series={[
              { key: "p50 ms", label: "p50", color: "#70a4ff" },
              { key: "p95 ms", label: "p95", color: "#dda0dd" }
            ]}
            height={260}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Provider breakdown"
        description="Performance by upstream provider"
        padded={false}
      >
        <DataTable
          columns={[
            {
              key: "provider",
              header: "Provider",
              render: (row) => <span className="font-medium text-white">{row.key}</span>
            },
            {
              key: "requests",
              header: "Requests",
              align: "right",
              render: (row) => row.requestCount.toLocaleString()
            },
            {
              key: "success",
              header: "Success",
              align: "right",
              render: (row) => `${(row.successRate * 100).toFixed(1)}%`
            },
            {
              key: "fallback",
              header: "Fallback",
              align: "right",
              render: (row) => `${(row.fallbackRate * 100).toFixed(1)}%`
            },
            {
              key: "latency",
              header: "Avg latency",
              align: "right",
              render: (row) =>
                row.averageLatencyMs ? `${row.averageLatencyMs}ms` : "—"
            },
            {
              key: "revenue",
              header: "Revenue",
              align: "right",
              render: (row) => formatUsdMicros(row.revenueUsdMicros)
            },
            {
              key: "margin",
              header: "Margin",
              align: "right",
              render: (row) => formatUsdMicros(row.grossMarginUsdMicros)
            }
          ]}
          rows={providerRows}
          rowKey={(row) => row.key}
        />
      </SectionCard>

      {fallbackRows.length > 0 && (
        <SectionCard
          title="Fallback paths"
          description="Requests that used a fallback route"
          padded={false}
        >
          <DataTable
            columns={[
              {
                key: "path",
                header: "Path",
                render: (row) => <span className="font-medium text-white">{row.path}</span>
              },
              {
                key: "requests",
                header: "Requests",
                align: "right",
                render: (row) => row.requestCount.toLocaleString()
              },
              {
                key: "success",
                header: "Success",
                align: "right",
                render: (row) => `${(row.successRate * 100).toFixed(1)}%`
              },
              {
                key: "revenue",
                header: "Revenue",
                align: "right",
                render: (row) => formatUsdMicros(row.revenueUsdMicros)
              }
            ]}
            rows={fallbackRows}
            rowKey={(row) => row.path}
          />
        </SectionCard>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
  buildHref
}: {
  label: string;
  options: string[];
  current: string;
  buildHref: (value: string) => string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = current === opt;
          return (
            <Link
              key={opt}
              href={buildHref(opt)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-white/8 bg-white/4 text-slate-400 hover:border-white/14 hover:text-white"
              }`}
            >
              {opt}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
