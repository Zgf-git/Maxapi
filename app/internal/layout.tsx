import { InternalShell } from "@/components/internal/internal-shell";
import { env } from "@/lib/env";
import { requireInternalAccess } from "@/lib/internal/auth";

export const dynamic = "force-dynamic";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const access = await requireInternalAccess();
  const environment: "live" | "sandbox" = env.PAYPAL_SANDBOX ? "sandbox" : "live";

  return (
    <InternalShell access={access} environment={environment}>
      {children}
    </InternalShell>
  );
}
