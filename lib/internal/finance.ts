import { db } from "@/lib/db";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

/* ── Revenue ───────────────────────────────────────────────────── */

export type DailyRevenue = {
  date: string;
  revenue: bigint;
  debits: bigint;
  margin: bigint;
};

export async function getRevenueTimeSeries(days = 30): Promise<DailyRevenue[]> {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const transactions = await db.balanceTransaction.findMany({
    where: { createdAt: { gte: start } },
    select: { type: true, amountUsdMicros: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  const map = new Map<string, { revenue: bigint; debits: bigint }>();

  for (const t of transactions) {
    const date = t.createdAt.toISOString().slice(0, 10);
    const entry = map.get(date) ?? { revenue: 0n, debits: 0n };
    if (t.type === "CREDIT") {
      entry.revenue += t.amountUsdMicros;
    } else if (t.type === "DEBIT") {
      entry.debits += t.amountUsdMicros;
    }
    map.set(date, entry);
  }

  const result: DailyRevenue[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const entry = map.get(date) ?? { revenue: 0n, debits: 0n };
    result.push({
      date,
      revenue: entry.revenue,
      debits: entry.debits,
      margin: entry.revenue - entry.debits
    });
  }

  return result;
}

/* ── Top-ups ───────────────────────────────────────────────────── */

export async function listTopUps(page: number, search?: string | null) {
  const PAGE_SIZE = 20;
  const where = search
    ? {
        OR: [
          { user: { email: { contains: search, mode: "insensitive" as const } } },
          { providerOrderId: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [items, total] = await Promise.all([
    db.topUpPurchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { email: true } }, paymentProviderInstance: true }
    }),
    db.topUpPurchase.count({ where })
  ]);

  return {
    items: items.map((t) => ({
      id: t.id,
      userEmail: t.user.email,
      provider: t.paymentProvider,
      status: t.status,
      amountUsdCents: t.amountUsdCents,
      creditsUsdMicros: t.creditsUsdMicros,
      createdAt: t.createdAt,
      creditedAt: t.creditedAt
    })),
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}

/* ── Cases ─────────────────────────────────────────────────────── */

export async function listCases({
  page,
  status,
  type
}: {
  page: number;
  status?: string | null;
  type?: string | null;
}) {
  const PAGE_SIZE = 20;
  const where = {
    ...(status ? { status: status as any } : {}),
    ...(type ? { type: type as any } : {})
  };

  const [items, total] = await Promise.all([
    db.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        targetUser: { select: { email: true } },
        actorUser: { select: { email: true } }
      }
    }),
    db.case.count({ where })
  ]);

  return {
    items,
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}

export async function getCaseDetail(id: string) {
  return db.case.findUnique({
    where: { id },
    include: {
      targetUser: { select: { id: true, email: true, name: true } },
      actorUser: { select: { id: true, email: true, name: true } }
    }
  });
}

/* ── Payment providers ─────────────────────────────────────────── */

export async function listPaymentProviderInstances() {
  return db.paymentProviderInstance.findMany({
    orderBy: { createdAt: "desc" },
    include: { topUpPurchases: { take: 5, orderBy: { createdAt: "desc" } } }
  });
}
