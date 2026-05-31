import type { PlanTier, RiskState, UserRole } from "@prisma/client";

import { env } from "@/lib/env";

export type SessionRoleUser = {
  id: string;
  email?: string | null;
  role?: UserRole | null;
};

const OPS_VIEW_ROLES = new Set<UserRole>(["OWNER", "ADMIN", "OPS", "AUDITOR"]);
const ADMIN_VIEW_ROLES = new Set<UserRole>(["OWNER", "ADMIN", "OPS", "SUPPORT", "AUDITOR"]);
const ADMIN_WRITE_ROLES = new Set<UserRole>(["OWNER", "ADMIN", "SUPPORT"]);
const ROLE_EDIT_ROLES = new Set<UserRole>(["OWNER", "ADMIN"]);

function normalizedRole(role?: UserRole | null) {
  return role ?? "USER";
}

function isLegacyOpsEmail(email?: string | null) {
  return email ? env.INTERNAL_OPS_EMAILS.includes(email.toLowerCase()) : false;
}

export function canViewOps(user?: SessionRoleUser | null) {
  if (!user) {
    return false;
  }

  return OPS_VIEW_ROLES.has(normalizedRole(user.role)) || isLegacyOpsEmail(user.email);
}

export function canViewAdmin(user?: SessionRoleUser | null) {
  if (!user) {
    return false;
  }

  return ADMIN_VIEW_ROLES.has(normalizedRole(user.role)) || isLegacyOpsEmail(user.email);
}

export function canManageProviders(user?: SessionRoleUser | null) {
  if (!user) {
    return false;
  }

  const role = normalizedRole(user.role);
  return role === "OWNER" || role === "ADMIN" || role === "OPS" || isLegacyOpsEmail(user.email);
}

export function canManageUsers(user?: SessionRoleUser | null) {
  return !!user && ADMIN_WRITE_ROLES.has(normalizedRole(user.role));
}

export function canEditRoles(user?: SessionRoleUser | null) {
  return !!user && ROLE_EDIT_ROLES.has(normalizedRole(user.role));
}

export function canViewAuditLogs(user?: SessionRoleUser | null) {
  return canViewAdmin(user);
}

export const ADMIN_ROLE_OPTIONS = [
  "USER",
  "SUPPORT",
  "OPS",
  "ADMIN",
  "OWNER",
  "AUDITOR"
] as const;

export const ADMIN_PLAN_OPTIONS = [
  "TRIAL",
  "BUILDER",
  "PRO",
  "ENTERPRISE"
] as const;

export const ADMIN_RISK_OPTIONS = [
  "NORMAL",
  "RATE_LIMITED",
  "RESTRICTED",
  "SUSPENDED"
] as const;
