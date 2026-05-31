import { db } from "@/lib/db";

export async function listPublishedAnnouncements(input?: {
  audience?: string;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const audience = input?.audience ?? "all";

  return (db as any).announcement.findMany({
    where: {
      status: "PUBLISHED",
      audience: {
        in: ["all", audience]
      },
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } }
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gt: now } }
          ]
        }
      ]
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    take: 20
  });
}

export async function listAdminAnnouncements(limit = 50) {
  return (db as any).announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdByUserId?: string | null;
}) {
  return (db as any).announcement.create({
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience ?? "all",
      status: input.status ?? "DRAFT",
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      createdByUserId: input.createdByUserId ?? null
    }
  });
}

export async function setAnnouncementStatus(input: {
  announcementId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  return (db as any).announcement.update({
    where: { id: input.announcementId },
    data: { status: input.status }
  });
}
