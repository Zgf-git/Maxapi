import type { SessionRoleUser } from "@/lib/access/rbac";
import { canViewOps } from "@/lib/access/rbac";

export function canAccessOpsDashboard(user: SessionRoleUser | string | null | undefined) {
  if (typeof user === "string" || user == null) {
    return canViewOps(user ? { id: "", email: user, role: null } : null);
  }

  return canViewOps(user);
}
