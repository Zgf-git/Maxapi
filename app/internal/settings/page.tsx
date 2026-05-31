import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { db } from "@/lib/db";

export const metadata = {
  title: "Settings · Internal · MaxAPI"
};

export default async function InternalSettingsPage() {
  const internalUsers = await db.user.findMany({
    where: {
      role: { in: ["SUPPORT", "OPS", "ADMIN", "OWNER", "AUDITOR"] }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      createdAt: true
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Settings"
        description="Internal members and environment configuration"
      />

      <SectionCard
        title="Internal members"
        description={`${internalUsers.length} user(s) with internal access`}
        padded={false}
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {internalUsers.map((user) => (
              <tr key={user.id} className="hover:bg-white/4 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{user.email}</div>
                  {user.name ? <div className="text-xs text-slate-500">{user.name}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-slate-300">{user.plan}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {user.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Environment" description="Current env flags">
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">PayPal Sandbox</span>
            <span>{process.env.PAYPAL_SANDBOX === "true" ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Require email verification</span>
            <span>{process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true" ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Self signup enabled</span>
            <span>{process.env.ENABLE_SELF_SIGNUP === "true" ? "Yes" : "No"}</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    ADMIN: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    OPS: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    SUPPORT: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    AUDITOR: "border-purple-300/20 bg-purple-300/10 text-purple-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[role] ?? styles.SUPPORT}`}>
      {role}
    </span>
  );
}
