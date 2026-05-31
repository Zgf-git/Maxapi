import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listPendingUsage } from "@/lib/internal/operations";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export const metadata = {
  title: "Pending usage · Operations · Internal · MaxAPI"
};

export default async function InternalPendingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { items, total, pageCount } = await listPendingUsage(page);

  const baseSearchParams = new URLSearchParams();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Pending usage"
        description={`${total.toLocaleString()} entries awaiting finalization`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "id",
              header: "ID",
              render: (row) => (
                <span className="font-mono text-xs text-slate-500">
                  {row.id.slice(0, 8)}…
                </span>
              )
            },
            {
              key: "user",
              header: "User",
              render: (row) => (
                <span className="text-sm text-white">{row.userId ?? "—"}</span>
              )
            },
            {
              key: "provider",
              header: "Provider",
              render: (row) => (
                <span className="text-sm text-slate-300">{row.provider ?? "—"}</span>
              )
            },
            {
              key: "model",
              header: "Model",
              render: (row) => (
                <span className="text-sm text-slate-300">{row.model ?? "—"}</span>
              )
            },
            {
              key: "tokens",
              header: "Tokens",
              align: "right",
              render: (row) => row.tokens?.toLocaleString() ?? "—"
            },
            {
              key: "cost",
              header: "Cost",
              align: "right",
              render: (row) => formatUsdMicros(row.totalCostUsdMicros)
            },
            {
              key: "created",
              header: "Created",
              render: (row) => formatDateTime(row.createdAt)
            }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
        {items.length > 0 && (
          <div className="border-t border-white/6 px-4 py-3">
            <Pagination page={page} pageCount={pageCount} baseSearchParams={baseSearchParams} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
