import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listCodes } from "@/lib/internal/growth";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export const metadata = {
  title: "Redemption codes · Growth · Internal · MaxAPI"
};

export default async function InternalCodesPage() {
  const codes = await listCodes();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Redemption codes"
        description={`${(codes as any[]).length} code(s)`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "label",
              header: "Label",
              render: (row: any) => (
                <div>
                  <div className="font-medium text-white">{row.label}</div>
                  <div className="font-mono text-xs text-slate-500">{row.codePrefix}…</div>
                </div>
              )
            },
            {
              key: "credit",
              header: "Credit",
              align: "right",
              render: (row: any) => formatUsdMicros(row.creditAmountUsdMicros)
            },
            {
              key: "redemptions",
              header: "Redemptions",
              align: "right",
              render: (row: any) => `${row.redeemedCount} / ${row.maxRedemptions}`
            },
            {
              key: "status",
              header: "Status",
              render: (row: any) => <StatusBadge status={row.status} />
            },
            {
              key: "expires",
              header: "Expires",
              render: (row: any) => formatDateTime(row.expiresAt)
            },
            {
              key: "created",
              header: "Created",
              render: (row: any) => formatDateTime(row.createdAt)
            }
          ]}
          rows={codes as any[]}
          rowKey={(row: any) => row.id}
        />
      </SectionCard>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    DISABLED: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    EXHAUSTED: "border-amber-300/20 bg-amber-300/10 text-amber-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.DISABLED}`}>
      {status}
    </span>
  );
}
