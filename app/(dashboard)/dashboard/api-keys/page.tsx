import { ApiKeysTable } from "@/components/dashboard/api-keys-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePageUser } from "@/lib/auth/session";
import { listApiKeys } from "@/lib/api-keys/service";

export default async function ApiKeysPage() {
  const user = await requirePageUser();
  const apiKeys = await listApiKeys(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage credentials for the unified API layer. Keys are shown once, hashed at rest, and can be revoked without being deleted."
        eyebrow="Security"
        title="API Keys"
      />
      <ApiKeysTable items={apiKeys} />
    </div>
  );
}
