import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function createAuditLog(input: {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
    }
  });
}

export async function listRecentAuditLogs(limit = 50) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actorUser: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}
