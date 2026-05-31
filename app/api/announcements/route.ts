import { NextResponse } from "next/server";

import { listPublishedAnnouncements } from "@/lib/announcements/service";

export async function GET() {
  const announcements = await listPublishedAnnouncements();

  return NextResponse.json({
    data: announcements.map((announcement: any) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt
    }))
  });
}
