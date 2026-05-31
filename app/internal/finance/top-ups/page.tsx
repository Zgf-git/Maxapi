import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SearchInput } from "@/components/internal/ui/search-input";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listTopUps } from "@/lib/internal/finance";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export const metadata = {
  title: "Top-ups · Finance · Internal · MaxAPI"
};

export default async function InternalTopUpsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search ?? null;

  const { items, total, pageCount } = await listTopUps(page, search);

  const baseSearchParams = new URLSearchParams();
  if (search) baseSearchParams.set("search", search);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Top-ups"
        description={`${total.toLocaleString()} orders`}
      />

      <form method="get" className="flex gap-2">
        <SearchInput
          name="search"
          placeholder="Search user email or order ID…"
          defaultValue={search ?? undefined}
          className="max-w-sm"
        />
      </form>

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "user",
              header: "User",
              render: (row) => <span className="text-white">{row.userEmail}</span>
            },
            {
              key: "provider",
              header: "Provider",
              render: (row) => (
                <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-slate-200">
                  {row.provider}
                </span>
              )
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (row) => (
                <div className="text-right">
                  <div className="text-white">${(row.amountUsdCents / 100).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">{formatUsdMicros(row.creditsUsdMicros)} credits</div>
                </div>
              )
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
              key: "credited",
              header: "Credited",
              render: (row) => formatDateTime(row.creditedAt)
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
    CREATED: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    CHECKOUT_CREATED: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    COMPLETED: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    CREDITED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    CANCELED: "border-rose-300/20 bg-rose-300/10 text-rose-200",
    FAILED: "border-rose-300/20 bg-rose-300/10 text-rose-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.CREATED}`}>
      {status}
    </span>
  );
}
