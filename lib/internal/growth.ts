import { db } from "@/lib/db";
import { formatUsdMicros } from "@/lib/utils";
import {
  listRedemptionCodes,
  setRedemptionCodeStatus
} from "@/lib/redemption/service";
import {
  listAdminAnnouncements,
  setAnnouncementStatus
} from "@/lib/announcements/service";

/* ── Redemption codes ──────────────────────────────────────────── */

export async function listCodes() {
  return listRedemptionCodes(50);
}

export async function toggleCodeStatus(codeId: string) {
  const codes = await listRedemptionCodes(1);
  const code = (codes as any[]).find((c) => c.id === codeId);
  if (!code) throw new Error("Code not found");

  const next =
    code.status === "ACTIVE" ? "DISABLED" : code.status === "DISABLED" ? "ACTIVE" : code.status;
  return setRedemptionCodeStatus({ codeId, status: next });
}

/* ── Announcements ─────────────────────────────────────────────── */

export async function listAnnouncements() {
  return listAdminAnnouncements(50);
}

export async function toggleAnnouncementStatus(announcementId: string) {
  const items = await listAdminAnnouncements(1);
  const item = (items as any[]).find((a) => a.id === announcementId);
  if (!item) throw new Error("Announcement not found");

  const cycle: Record<string, string> = {
    DRAFT: "PUBLISHED",
    PUBLISHED: "ARCHIVED",
    ARCHIVED: "DRAFT"
  };
  const next = cycle[item.status] ?? "DRAFT";
  return setAnnouncementStatus({ announcementId, status: next as any });
}

/* ── Referrals ─────────────────────────────────────────────────── */

export async function listReferrals(page: number) {
  const PAGE_SIZE = 20;
  const [items, total] = await Promise.all([
    db.referralCommission.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        referrer: { select: { email: true } },
        referred: { select: { email: true } }
      }
    }),
    db.referralCommission.count()
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      referrerEmail: r.referrer.email,
      referredEmail: r.referred.email,
      amountUsdMicros: r.amountUsdMicros,
      amountFormatted: formatUsdMicros(r.amountUsdMicros),
      status: r.status,
      createdAt: r.createdAt,
      paidAt: r.paidAt
    })),
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}
