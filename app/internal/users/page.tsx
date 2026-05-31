import { Suspense } from "react";

import { DataTable } from "@/components/internal/ui/data-table";
import { FilterChips } from "@/components/internal/ui/filter-chips";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SearchInput } from "@/components/internal/ui/search-input";
import { SectionCard } from "@/components/internal/ui/section-card";
import {
  ADMIN_PLAN_OPTIONS,
  ADMIN_RISK_OPTIONS,
  ADMIN_ROLE_OPTIONS
} from "@/lib/access/rbac";
import { listUsers } from "@/lib/internal/users";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Users · Internal · MaxAPI"
};

export default async function InternalUsersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search ?? null;
  const plan = ADMIN_PLAN_OPTIONS.includes(params.plan as any) ? (params.plan as any) : null;
  const role = ADMIN_ROLE_OPTIONS.includes(params.role as any) ? (params.role as any) : null;
  const riskState = ADMIN_RISK_OPTIONS.includes(params.riskState as any) ? (params.riskState as any) : null;

  const { users, total, pageCount } = await listUsers({
    page,
    filters: { search, plan, role, riskState }
  });

  const baseSearchParams = new URLSearchParams();
  if (search) baseSearchParams.set("search", search);
  if (plan) baseSearchParams.set("plan", plan);
  if (role) baseSearchParams.set("role", role);
  if (riskState) baseSearchParams.set("riskState", riskState);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Users"
        description={`${total.toLocaleString()} total users`}
        actions={
          <div className="text-sm text-slate-400">
            Page {page} of {pageCount}
          </div>
        }
      />

      <Suspense fallback={null}>
        <div className="space-y-3">
          <form method="get" className="flex gap-2">
            <SearchInput
              name="search"
              placeholder="Search email or name…"
              defaultValue={search ?? undefined}
              className="max-w-sm"
            />
            {plan ? <input type="hidden" name="plan" value={plan} /> : null}
            {role ? <input type="hidden" name="role" value={role} /> : null}
            {riskState ? <input type="hidden" name="riskState" value={riskState} /> : null}
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <FilterChips
              label="Plan"
              paramKey="plan"
              current={plan}
              options={ADMIN_PLAN_OPTIONS.map((v) => ({ value: v, label: v }))}
              baseSearchParams={baseSearchParams}
            />
            <FilterChips
              label="Role"
              paramKey="role"
              current={role}
              options={ADMIN_ROLE_OPTIONS.map((v) => ({ value: v, label: v }))}
              baseSearchParams={baseSearchParams}
            />
            <FilterChips
              label="Risk"
              paramKey="riskState"
              current={riskState}
              options={ADMIN_RISK_OPTIONS.map((v) => ({ value: v, label: v }))}
              baseSearchParams={baseSearchParams}
            />
          </div>

          <SectionCard padded={false}>
            <DataTable
              columns={[
                {
                  key: "email",
                  header: "Email",
                  render: (row) => (
                    <div>
                      <div className="font-medium text-white">{row.email}</div>
                      {row.name ? <div className="text-xs text-slate-500">{row.name}</div> : null}
                    </div>
                  )
                },
                {
                  key: "plan",
                  header: "Plan",
                  render: (row) => (
                    <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-slate-200">
                      {row.plan}
                    </span>
                  )
                },
                {
                  key: "role",
                  header: "Role",
                  render: (row) => (
                    <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-slate-200">
                      {row.role}
                    </span>
                  )
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  render: (row) => row.balanceFormatted
                },
                {
                  key: "requests",
                  header: "Reqs · 7d",
                  align: "right",
                  render: (row) => row.requestCount7d.toLocaleString()
                },
                {
                  key: "created",
                  header: "Created",
                  render: (row) => formatDateTime(row.createdAt)
                }
              ]}
              rows={users}
              rowKey={(row) => row.id}
              rowHref={(row) => `/internal/users/${row.id}`}
            />
            {users.length > 0 && (
              <div className="border-t border-white/6 px-4 py-3">
                <Pagination page={page} pageCount={pageCount} baseSearchParams={baseSearchParams} />
              </div>
            )}
          </SectionCard>
        </div>
      </Suspense>
    </div>
  );
}
