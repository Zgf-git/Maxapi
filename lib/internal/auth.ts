import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import {
  canEditRoles,
  canManageProviders,
  canManageUsers,
  canViewAdmin,
  canViewOps,
  type SessionRoleUser
} from "@/lib/access/rbac";
import { requirePageUser } from "@/lib/auth/session";

export type InternalCapabilities = {
  viewAdmin: boolean;
  viewOps: boolean;
  manageUsers: boolean;
  manageProviders: boolean;
  editRoles: boolean;
};

export type InternalAccess = {
  user: SessionRoleUser & { name?: string | null };
  capabilities: InternalCapabilities;
};

type RequireOptions = {
  requires?: "admin" | "ops" | "any";
};

export async function requireInternalAccess(
  options: RequireOptions = {}
): Promise<InternalAccess> {
  const sessionUser = await requirePageUser();
  const role = (sessionUser.role ?? null) as UserRole | null;
  const user: SessionRoleUser & { name?: string | null } = {
    id: sessionUser.id,
    email: sessionUser.email ?? null,
    role,
    name: sessionUser.name ?? null
  };

  const capabilities: InternalCapabilities = {
    viewAdmin: canViewAdmin(user),
    viewOps: canViewOps(user),
    manageUsers: canManageUsers(user),
    manageProviders: canManageProviders(user),
    editRoles: canEditRoles(user)
  };

  const requires = options.requires ?? "any";
  const allowed =
    requires === "admin"
      ? capabilities.viewAdmin
      : requires === "ops"
        ? capabilities.viewOps
        : capabilities.viewAdmin || capabilities.viewOps;

  if (!allowed) {
    redirect("/dashboard");
  }

  return { user, capabilities };
}
