import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublishedAnnouncements = vi.fn();

vi.mock("@/lib/announcements/service", () => ({
  listPublishedAnnouncements
}));

describe("announcements API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPublishedAnnouncements.mockResolvedValue([
      {
        id: "ann_1",
        title: "Maintenance",
        body: "A short window is scheduled.",
        audience: "all",
        startsAt: null,
        endsAt: null
      }
    ]);
  });

  it("returns published announcements", async () => {
    const { GET } = await import("@/app/api/announcements/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [
        {
          id: "ann_1",
          title: "Maintenance"
        }
      ]
    });
  });
});
