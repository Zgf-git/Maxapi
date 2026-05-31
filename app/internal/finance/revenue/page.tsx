import { TrendAreaChart } from "@/components/internal/ui/area-chart";
import { MetricCard, MetricGrid } from "@/components/internal/ui/metric-card";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { getRevenueTimeSeries } from "@/lib/internal/finance";
import { formatUsdMicros } from "@/lib/utils";

export const metadata = {
  title: "Revenue · Finance · Internal · MaxAPI"
};

function microsToNumber(value: bigint): number {
  return Number(value) / 1_000_000;
}

export default async function InternalRevenuePage() {
  const series = await getRevenueTimeSeries(30);

  const totalRevenue = series.reduce((sum, d) => sum + d.revenue, 0n);
  const totalDebits = series.reduce((sum, d) => sum + d.debits, 0n);
  const totalMargin = totalRevenue - totalDebits;

  const chartData = series.map((d) => ({
    date: d.date.slice(5),
    Revenue: microsToNumber(d.revenue),
    Debits: microsToNumber(d.debits),
    Margin: microsToNumber(d.margin)
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Revenue"
        description="Money flow over the last 30 days."
      />

      <MetricGrid>
        <MetricCard label="Revenue · 30d" value={formatUsdMicros(totalRevenue)} />
        <MetricCard label="Debits · 30d" value={formatUsdMicros(totalDebits)} />
        <MetricCard label="Margin · 30d" value={formatUsdMicros(totalMargin)} />
        <MetricCard
          label="Margin %"
          value={
            totalRevenue > 0n
              ? `${((Number(totalMargin) / Number(totalRevenue)) * 100).toFixed(1)}%`
              : "—"
          }
        />
      </MetricGrid>

      <SectionCard title="Revenue · Cost · Margin" description="Daily breakdown">
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
    </div>
  );
}
