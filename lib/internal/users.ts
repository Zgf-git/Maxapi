import type { PlanTier, RiskState, UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import { formatUsdMicros } from "@/lib/utils";
import { updateUserAdminSettings } from "@/lib/admin/service";

export type UserListFilters = {
  search?: string | null;
  plan?: PlanTier | null;
  role?: UserRole | null;
  riskState?: RiskState | null;
};

export type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  role: UserRole;
  riskState: RiskState;
  balanceUsdMicros: bigint | null;
  balanceFormatted: string;
  requestCount7d: number;
  createdAt: Date;
};

const PAGE_SIZE = 20;

export async function listUsers({
  page,
  filters
}: {
  page: number;
  filters: UserListFilters;
}): Promise<{ users: UserListItem[]; total: number; pageCount: number }> {
  const where = {
    ...(filters.search
      ? {
          OR: [
            { email: { contains: filters.search, mode: "insensitive" as const } },
            { name: { contains: filters.search, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters.plan ? { plan: filters.plan } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.riskState ? { riskState: filters.riskState } : {})
  };

  const [usersRaw, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { userBalance: true }
    }),
    db.user.count({ where })
  ]);

  const userIds = usersRaw.map((u) => u.id);
  const requestCounts =
    userIds.length > 0
      ? await db.requestLog.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          _count: { id: true }
        })
      : [];

  const countMap = new Map(requestCounts.map((r) => [r.userId, r._count.id]));

  const users: UserListItem[] = usersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    role: u.role,
    riskState: u.riskState,
    balanceUsdMicros: u.userBalance?.balanceUsdMicros ?? null,
    balanceFormatted: formatUsdMicros(u.userBalance?.balanceUsdMicros ?? 0n),
    requestCount7d: countMap.get(u.id) ?? 0,
    createdAt: u.createdAt
  }));

  return { users, total, pageCount: Math.ceil(total / PAGE_SIZE) };
}

export type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  role: UserRole;
  riskState: RiskState;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  referrerEmail: string | null;
  balanceUsdMicros: bigint | null;
  balanceFormatted: string;
  apiKeys: { id: string; name: string | null; keyPrefix: string | null; createdAt: Date }[];
};

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      userBalance: true,
      referrer: { select: { email: true } },
      apiKeys: { select: { id: true, name: true, keyPrefix: true, createdAt: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    role: user.role,
    riskState: user.riskState,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    referrerEmail: user.referrer?.email ?? null,
    balanceUsdMicros: user.userBalance?.balanceUsdMicros ?? null,
    balanceFormatted: formatUsdMicros(user.userBalance?.balanceUsdMicros ?? 0n),
    apiKeys: user.apiKeys
  };
}

export async function getUserActivity(userId: string, page: number) {
  const PAGE_SIZE = 50;
  const [logs, total] = await Promise.all([
    db.requestLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE
    }),
    db.requestLog.count({ where: { userId } })
  ]);

  return { logs, total, pageCount: Math.ceil(total / PAGE_SIZE) };
}

export async function getUserCases(userId: string) {
  return db.billingResolution.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}

export async function getUserAudit(userId: string) {
  return db.auditLog.findMany({
    where: { targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

/* ── Balance history ───────────────────────────────────────────── */

export async function getUserBalanceHistory(userId: string) {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const transactions = await db.balanceTransaction.findMany({
    where: { userId, createdAt: { gte: start } },
    select: { amountUsdMicros: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  const map = new Map<string, bigint>();
  for (const t of transactions) {
    const date = t.createdAt.toISOString().slice(0, 10);
    map.set(date, (map.get(date) ?? 0n) + t.amountUsdMicros);
  }

  const result: Array<{ date: string; amount: bigint; amountFormatted: string }> = [];
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const amount = map.get(date) ?? 0n;
    result.push({ date, amount, amountFormatted: formatUsdMicros(amount) });
  }

  return result;
}

/* ── Mutations ─────────────────────────────────────────────────── */

export { updateUserAdminSettings };

export async function mutateUserSettings(formData: FormData) {
  "use server";

  const actorUserId = String(formData.get("actorUserId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole | undefined;
  const plan = String(formData.get("plan") ?? "") as PlanTier | undefined;
  const riskState = String(formData.get("riskState") ?? "") as RiskState | undefined;

  await updateUserAdminSettings({
    actorUserId,
    targetUserId,
    ...(role ? { role } : {}),
    ...(plan ? { plan } : {}),
    ...(riskState ? { riskState } : {})
  });
}
