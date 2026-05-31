import { ApiKeyStatus } from "@prisma/client";

import { updateApiKeyControlsAction } from "@/components/dashboard/api-key-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateApiKeyDialog } from "@/components/dashboard/create-api-key-dialog";
import { RevokeApiKeyButton } from "@/components/dashboard/revoke-api-key-button";
import { formatDateTime } from "@/lib/utils";
import { KeyRound } from "lucide-react";

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  maskedSuffix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  status: ApiKeyStatus;
  isEnabled: boolean;
  expiresAt: Date | null;
  requestsPerMinuteLimit: number | null;
  concurrentRequestsLimit: number | null;
  dailyRequestLimit: number | null;
  dailyRequestCount: number;
  dailyRequestWindowStart: Date | null;
};

export function ApiKeysTable({ items }: { items: ApiKeyItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>No API keys yet</CardTitle>
            <CardDescription>Create the first credential for your application or internal tools.</CardDescription>
          </div>
          <CreateApiKeyDialog />
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-8 text-sm text-slate-400">
            New keys are shown once, hashed in the database, and can be revoked without being deleted.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Manage credentials for the unified API layer.</CardDescription>
        </div>
        <CreateApiKeyDialog />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Prefix</th>
              <th className="pb-3 font-medium">Suffix</th>
              <th className="pb-3 font-medium">Created</th>
              <th className="pb-3 font-medium">Last used</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Controls</th>
              <th className="pb-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr className="transition hover:bg-white/[0.03]" key={item.id}>
                <td className="px-1 py-4 font-medium text-slate-100">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-slate-500" />
                    {item.name}
                  </div>
                </td>
                <td className="px-1 py-4 font-mono text-slate-400">{item.keyPrefix}</td>
                <td className="px-1 py-4 font-mono text-slate-400">{item.maskedSuffix}</td>
                <td className="px-1 py-4 text-slate-400">{formatDateTime(item.createdAt)}</td>
                <td className="px-1 py-4 text-slate-400">{formatDateTime(item.lastUsedAt)}</td>
                <td className="px-1 py-4">
                  <Badge
                    variant={item.status === ApiKeyStatus.ACTIVE && item.isEnabled ? "success" : "muted"}
                    className={
                      item.status === ApiKeyStatus.ACTIVE && item.isEnabled
                        ? "bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/12"
                        : "bg-white/8 text-slate-300 hover:bg-white/8"
                    }
                  >
                    {item.status === ApiKeyStatus.REVOKED ? "Revoked" : item.isEnabled ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="px-1 py-4">
                  <form
                    action={async (formData) => {
                      "use server";
                      await updateApiKeyControlsAction(formData);
                    }}
                    className="grid gap-2 md:grid-cols-2"
                  >
                    <input name="keyId" type="hidden" value={item.id} />
                    <select className="rounded-lg border bg-background px-2 py-1.5 text-xs" defaultValue={String(item.isEnabled)} name="isEnabled">
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                    <input className="rounded-lg border bg-background px-2 py-1.5 text-xs" defaultValue={item.requestsPerMinuteLimit ?? ""} name="requestsPerMinuteLimit" placeholder="RPM" type="number" min={1} />
                    <input className="rounded-lg border bg-background px-2 py-1.5 text-xs" defaultValue={item.concurrentRequestsLimit ?? ""} name="concurrentRequestsLimit" placeholder="Concurrency" type="number" min={1} />
                    <input className="rounded-lg border bg-background px-2 py-1.5 text-xs" defaultValue={item.dailyRequestLimit ?? ""} name="dailyRequestLimit" placeholder="Daily limit" type="number" min={1} />
                    <input
                      className="rounded-lg border bg-background px-2 py-1.5 text-xs"
                      defaultValue={item.expiresAt ? new Date(item.expiresAt.getTime() - item.expiresAt.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""}
                      name="expiresAt"
                      type="datetime-local"
                    />
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        Used today {item.dailyRequestCount}{item.dailyRequestWindowStart ? ` since ${formatDateTime(item.dailyRequestWindowStart)}` : ""}
                      </span>
                      <button className="rounded-lg border px-3 py-1.5 text-xs font-medium" type="submit">
                        Save controls
                      </button>
                    </div>
                  </form>
                </td>
                <td className="px-1 py-4 text-right">
                  <RevokeApiKeyButton disabled={item.status === ApiKeyStatus.REVOKED} keyId={item.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
