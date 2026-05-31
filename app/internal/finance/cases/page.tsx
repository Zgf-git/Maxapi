import Link from "next/link";

import { DataTable } from "@/components/internal/ui/data-table";
import { FilterChips } from "@/components/internal/ui/filter-chips";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listCases } from "@/lib/internal/finance";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

const CASE_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COMPLETED", label: "Completed" }
];

const CASE_TYPE_OPTIONS = [
  { value: "REFUND", label: "Refund" },
  { value: "COMPENSATION", label: "Compensation" },
  { value: "MANUAL_ADJUSTMENT", label: "Adjustment" },
  { value: "ABUSE_REVIEW", label: "Abuse" }
];

export const metadata = {
  title: "Cases · Finance · Internal · MaxAPI"
};

export default async function InternalCasesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = CASE_STATUS_OPTIONS.some((o) => o.value === params.status)
    ? params.status!
    : null;
  const type = CASE_TYPE_OPTIONS.some((o) => o.value === params.type)
    ? params.type!
    : null;

  const { items, total, pageCount } = await listCases({ page, status, type });

  const baseSearchParams = new URLSearchParams();
  if (status) baseSearchParams.set("status", status);
  if (type) baseSearchParams.set("type", type);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Cases"
        description={`${total.toLocaleString()} total — refund, compensation, and manual adjustment queue`}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterChips
            label="Status"
            paramKey="status"
            current={status}
            options={CASE_STATUS_OPTIONS}
            baseSearchParams={baseSearchParams}
          />
          <FilterChips
            label="Type"
            paramKey="type"
            current={type}
            options={CASE_TYPE_OPTIONS}
            baseSearchParams={baseSearchParams}
          />
        </div>

        <SectionCard padded={false}>
          <DataTable
            columns={[
              {
                key: "id",
                header: "Case",
                render: (row) => (
                  <div>
                    <div className="font-mono text-xs text-slate-500">
                      {row.id.slice(0, 8)}…
                    </div>
                    <div className="text-sm font-medium text-white">
                      {row.type}
                    </div>
                  </div>
                )
              },
              {
                key: "target",
                header: "Target user",
                render: (row) => (
                  <Link
                    href={`/internal/users/${row.targetUserId}`}
                    className="text-sm text-cyan-200 hover:underline"
                  >
                    {row.targetUser.email}
                  </Link>
                )
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                render: (row) =>
                  row.amountUsdMicros ? formatUsdMicros(row.amountUsdMicros) : "—"
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "reason",
                header: "Reason",
                render: (row) => (
                  <span className="line-clamp-1 text-sm text-slate-300">
                    {row.reason ?? "—"}
                  </span>
                )
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
              <Pagination
                page={page}
                pageCount={pageCount}
                baseSearchParams={baseSearchParams}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    PENDING_APPROVAL: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    APPROVED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    REJECTED: "border-rose-300/20 bg-rose-300/10 text-rose-200",
    COMPLETED: "border-slate-300/20 bg-slate-300/10 text-slate-200"
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.OPEN}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
