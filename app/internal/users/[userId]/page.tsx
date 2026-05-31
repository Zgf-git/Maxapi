import { notFound } from "next/navigation";
import {
  Activity,
  Ban,
  ChevronRight,
  Clock,
  KeyRound,
  Mail,
  ShieldAlert,
  UserCog,
  Zap
} from "lucide-react";

import { EmptyState } from "@/components/internal/ui/empty-state";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { UserDetailTabs } from "@/components/internal/users/user-detail-tabs";
import { requirePageUser } from "@/lib/auth/session";
import {
  formatDateTime,
  formatUsdMicros
} from "@/lib/utils";
import {
  getUserActivity,
  getUserAudit,
  getUserBalanceHistory,
  getUserCases,
  getUserDetail,
  mutateUserSettings
} from "@/lib/internal/users";
import { ADMIN_PLAN_OPTIONS, ADMIN_ROLE_OPTIONS, ADMIN_RISK_OPTIONS } from "@/lib/access/rbac";

export const metadata = {
  title: "User · Internal · MaxAPI"
};

export default async function InternalUserDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { userId } = await params;
  const tab = (await searchParams).tab ?? "activity";

  const [currentUser, user, balanceHistory] = await Promise.all([
    requirePageUser(),
    getUserDetail(userId),
    getUserBalanceHistory(userId)
  ]);
  if (!user) notFound();

  const maxAmount = balanceHistory.reduce(
    (max, d) => (d.amount > max ? d.amount : max),
    1n
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={user.email}
        description={`${user.plan} · ${user.role} · ${user.riskState}`}
        meta={`Created ${formatDateTime(user.createdAt)} · Last updated ${formatDateTime(user.updatedAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Left summary */}
        <div className="space-y-4">
          <SectionCard title="Profile" className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Plan</span>
                <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-white">
                  {user.plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Role</span>
                <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-white">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Risk</span>
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    user.riskState === "NORMAL"
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                      : user.riskState === "SUSPENDED"
                        ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
                        : "border-amber-300/20 bg-amber-300/10 text-amber-200"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {user.riskState}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{user.emailVerifiedAt ? "Verified" : "Not verified"}</span>
              </div>
              {user.referrerEmail ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Referrer</span>
                  <span className="text-slate-200">{user.referrerEmail}</span>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Balance">
            <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">
              {user.balanceFormatted}
            </div>
            <div className="mt-3 space-y-2">
              <div className="text-xs text-slate-400">30d transaction volume</div>
              <div className="flex items-end gap-0.5">
                {balanceHistory.map((d, i) => {
                  const h = maxAmount > 0n ? (Number(d.amount) / Number(maxAmount)) * 60 : 4;
                  return (
                    <div
                      key={i}
                      className={`w-full rounded-sm ${d.amount >= 0n ? "bg-cyan-300/30" : "bg-rose-300/30"}`}
                      style={{ height: `${Math.max(4, h)}px` }}
                      title={`${d.date}: ${d.amountFormatted}`}
                    />
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="space-y-2">
              <ActionButton icon={<ShieldAlert className="h-4 w-4" />} label="Rate-limit user" tone="warning" />
              <ActionButton icon={<Ban className="h-4 w-4" />} label="Suspend account" tone="danger" />
              <ActionButton icon={<Mail className="h-4 w-4" />} label="Force email re-verify" tone="neutral" />
              <ActionButton icon={<Zap className="h-4 w-4" />} label="Adjust balance via case" tone="neutral" />
            </div>
          </SectionCard>
        </div>

        {/* Right tabs */}
        <div>
          <UserDetailTabs userId={userId} />

          <div className="mt-4">
            {tab === "activity" && <ActivityTab userId={userId} />}
            {tab === "cases" && <CasesTab userId={userId} />}
            {tab === "audit" && <AuditTab userId={userId} />}
            {tab === "keys" && <KeysTab user={user} />}
            {tab === "actions" && <ActionsTab user={user} actorUserId={currentUser.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  tone: "danger" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "text-rose-300 hover:bg-rose-300/10 hover:text-rose-200"
      : tone === "warning"
        ? "text-amber-300 hover:bg-amber-300/10 hover:text-amber-200"
        : "text-slate-300 hover:bg-white/6 hover:text-white";

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-xl border border-white/6 px-3 py-2 text-left text-sm transition ${toneClass}`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
    </button>
  );
}

/* ── Activity tab ─────────────────────────────────────────────── */

async function ActivityTab({ userId }: { userId: string }) {
  const { logs } = await getUserActivity(userId, 1);

  return (
    <SectionCard title="Recent requests" description="Last 50 requests" padded={false}>
      {logs.length === 0 ? (
        <EmptyState title="No requests yet" description="This user has not made any API calls." />
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Tokens</th>
              <th className="px-4 py-3 font-medium text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/4 transition">
                <td className="px-4 py-3 text-slate-300">
                  <span className="tabular-nums">{formatDateTime(log.createdAt)}</span>
                </td>
                <td className="px-4 py-3 text-white">{log.requestedModel ?? log.upstreamModel ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={log.status} httpStatus={log.httpStatus} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                  {log.totalTokens ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                  {log.latencyMs ? `${log.latencyMs}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

function StatusBadge({ status, httpStatus }: { status: string; httpStatus: number }) {
  const isError = status === "ERROR" || httpStatus >= 400;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
        isError
          ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
          : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
      }`}
    >
      {httpStatus}
    </span>
  );
}

/* ── Cases tab ─────────────────────────────────────────────────── */

async function CasesTab({ userId }: { userId: string }) {
  const cases = await getUserCases(userId);

  return (
    <SectionCard title="Cases" description="Refund, compensation, and manual adjustment cases">
      {cases.length === 0 ? (
        <EmptyState title="No cases" description="This user has no open or resolved cases." />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {c.type} — {formatUsdMicros(c.amountUsdMicros)}
                </div>
                <div className="text-xs text-slate-400">{c.reason}</div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  c.status === "OPEN"
                    ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                    : c.status === "APPLIED"
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                      : "border-slate-300/20 bg-slate-300/10 text-slate-200"
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Audit tab ─────────────────────────────────────────────────── */

async function AuditTab({ userId }: { userId: string }) {
  const entries = await getUserAudit(userId);

  return (
    <SectionCard title="Audit log" description="Internal actions targeting this user">
      {entries.length === 0 ? (
        <EmptyState title="No audit entries" description="Nothing has been recorded yet." />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <span className="font-medium text-white">{entry.action}</span>
                <span className="mx-2 text-slate-500">·</span>
                <span className="text-slate-400">{formatDateTime(entry.createdAt)}</span>
                {entry.metadata ? (
                  <pre className="mt-1 max-h-24 overflow-auto rounded border border-white/6 bg-white/4 p-2 text-xs text-slate-300">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Keys tab ──────────────────────────────────────────────────── */

function KeysTab({
  user
}: {
  user: Awaited<ReturnType<typeof getUserDetail>> & {};
}) {
  return (
    <SectionCard title="API keys" description={`${user.apiKeys.length} key(s)`}>
      {user.apiKeys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-6 w-6" />}
          title="No API keys"
          description="This user has not created any API keys."
        />
      ) : (
        <div className="space-y-2">
          {user.apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-white">{key.name ?? "Unnamed key"}</div>
                <div className="text-xs tabular-nums text-slate-400">{key.keyPrefix ?? key.id.slice(0, 8)}…</div>
              </div>
              <div className="text-xs text-slate-500">{formatDateTime(key.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Actions tab ───────────────────────────────────────────────── */

function ActionsTab({
  user,
  actorUserId
}: {
  user: Awaited<ReturnType<typeof getUserDetail>> & {};
  actorUserId: string;
}) {
  return (
    <div className="space-y-4">
      <SectionCard title="Account" description="Change plan, role, or risk state">
        <form action={mutateUserSettings} className="space-y-3">
          <input name="actorUserId" type="hidden" value={actorUserId} />
          <input name="targetUserId" type="hidden" value={user.id} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Plan</label>
              <select
                name="plan"
                defaultValue={user.plan}
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none"
              >
                {ADMIN_PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Role</label>
              <select
                name="role"
                defaultValue={user.role}
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none"
              >
                {ADMIN_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Risk</label>
              <select
                name="riskState"
                defaultValue={user.riskState}
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none"
              >
                {ADMIN_RISK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-cyan-300/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/30"
          >
            Save changes
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Danger zone" description="Irreversible or high-impact actions">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-300/20"
          >
            Suspend account
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-300/20"
          >
            Force email re-verify
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
