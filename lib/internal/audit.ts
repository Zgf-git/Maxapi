import { db } from "@/lib/db";

export async function searchAuditLogs({
  page,
  action,
  resourceType
}: {
  page: number;
  action?: string | null;
  resourceType?: string | null;
}) {
  const PAGE_SIZE = 50;
  const where: any = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (resourceType) where.resourceType = { contains: resourceType, mode: "insensitive" };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        actorUser: { select: { email: true } },
        targetUser: { select: { email: true } }
      }
    }),
    db.auditLog.count({ where })
  ]);

  return {
    items,
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}
