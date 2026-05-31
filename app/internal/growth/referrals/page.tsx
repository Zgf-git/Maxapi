import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listReferrals } from "@/lib/internal/growth";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Referrals · Growth · Internal · MaxAPI"
};

export default async function InternalReferralsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { items, total, pageCount } = await listReferrals(page);

  const baseSearchParams = new URLSearchParams();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Referrals"
        description={`${total.toLocaleString()} commissions`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "referrer",
              header: "Referrer",
              render: (row) => <span className="text-sm text-white">{row.referrerEmail}</span>
            },
            {
              key: "referred",
              header: "Referred",
              render: (row) => <span className="text-sm text-white">{row.referredEmail}</span>
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (row) => row.amountFormatted
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "created",
              header: "Created",
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "paid",
              header: "Paid",
              render: (row) => formatDateTime(row.paidAt)
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    PAID: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.PENDING}`}>
      {status}
    </span>
  );
}
