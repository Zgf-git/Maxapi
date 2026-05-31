import type { ReactNode } from "react";

import { InternalHeader } from "./internal-header";
import { InternalSidebar } from "./internal-sidebar";
import type { InternalAccess } from "@/lib/internal/auth";

type InternalShellProps = {
  access: InternalAccess;
  environment: "live" | "sandbox";
  children: ReactNode;
};

export function InternalShell({ access, environment, children }: InternalShellProps) {
  return (
    <div className="app-shell-grid flex min-h-screen">
      <InternalSidebar capabilities={access.capabilities} />
      <div className="flex flex-1 flex-col">
        <InternalHeader
          userEmail={access.user.email ?? null}
          userRole={access.user.role ?? null}
          environment={environment}
        />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
