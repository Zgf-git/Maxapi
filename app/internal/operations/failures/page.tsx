import Link from "next/link";

import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listRecentFailures } from "@/lib/internal/operations";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Failures · Operations · Internal · MaxAPI"
};

export default async function InternalFailuresPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { items, total, pageCount } = await listRecentFailures(page);

  const baseSearchParams = new URLSearchParams();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Failures"
        description={`${total.toLocaleString()} failed requests`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "time",
              header: "Time",
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "provider",
              header: "Provider / Model",
              render: (row) => (
                <div>
                  <div className="text-white">{row.provider}</div>
                  <div className="text-xs text-slate-500">{row.upstreamModel ?? row.requestedModel ?? "—"}</div>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <span className="inline-flex rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-0.5 text-xs font-medium text-rose-200">
                  {row.httpStatus}
                </span>
              )
            },
            {
              key: "error",
              header: "Error",
              render: (row) => (
                <div>
                  <div className="text-sm text-white">{row.errorCode ?? "—"}</div>
                  <div className="max-w-xs truncate text-xs text-slate-500">{row.errorMessage ?? "—"}</div>
                </div>
              )
            },
            {
              key: "latency",
              header: "Latency",
              align: "right",
              render: (row) => row.latencyMs ? `${row.latencyMs}ms` : "—"
            },
            {
              key: "user",
              header: "User",
              render: (row) =>
                row.userId ? (
                  <Link href={`/internal/users/${row.userId}`} className="text-sm text-cyan-200 hover:underline">
                    {row.userId.slice(0, 8)}…
                  </Link>
                ) : (
                  "—"
                )
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
