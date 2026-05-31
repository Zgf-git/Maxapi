import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function DashboardShell({
  children,
  showBilling = true,
  showReferral = true,
  planLabel,
  userEmail
}: {
  children: React.ReactNode;
  showBilling?: boolean;
  showReferral?: boolean;
  planLabel?: string;
  userEmail?: string | null;
}) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="app-shell-grid flex min-h-screen bg-transparent">
      <DashboardSidebar showBilling={showBilling} showReferral={showReferral} />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-[#07111fcc]/90 px-6 py-4 backdrop-blur-xl">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-300">
            Developer Console
          </div>
          <div className="flex items-center gap-4">
            {planLabel ? (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {planLabel}
              </span>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-xs font-bold text-slate-100">
                {initial}
              </div>
              <span className="hidden text-sm text-slate-300 sm:inline">{userEmail ?? "User"}</span>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="p-6 text-slate-100">{children}</main>
      </div>
    </div>
  );
}
