import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  }
}));

vi.mock("@/lib/auth/session", () => ({
  requirePageUser: vi.fn()
}));

describe("requireInternalAccess", () => {
  it("allows OWNER role", async () => {
    const { requirePageUser } = await import("@/lib/auth/session");
    (requirePageUser as any).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      role: "OWNER",
      name: "Admin"
    });

    const { requireInternalAccess } = await import("@/lib/internal/auth");
    const result = await requireInternalAccess();
    expect(result.user.role).toBe("OWNER");
    expect(result.capabilities.viewAdmin).toBe(true);
  });

  it("allows ADMIN role", async () => {
    const { requirePageUser } = await import("@/lib/auth/session");
    (requirePageUser as any).mockResolvedValue({
      id: "u2",
      email: "a@b.com",
      role: "ADMIN",
      name: "Admin"
    });

    const { requireInternalAccess } = await import("@/lib/internal/auth");
    const result = await requireInternalAccess();
    expect(result.capabilities.viewAdmin).toBe(true);
  });

  it("allows SUPPORT role (admin view only)", async () => {
    const { requirePageUser } = await import("@/lib/auth/session");
    (requirePageUser as any).mockResolvedValue({
      id: "u3",
      email: "a@b.com",
      role: "SUPPORT",
      name: "Support"
    });

    const { requireInternalAccess } = await import("@/lib/internal/auth");
    const result = await requireInternalAccess();
    expect(result.capabilities.viewAdmin).toBe(true);
    expect(result.capabilities.viewOps).toBe(false);
  });

  it("redirects USER role to dashboard", async () => {
    const { requirePageUser } = await import("@/lib/auth/session");
    (requirePageUser as any).mockResolvedValue({
      id: "u4",
      email: "a@b.com",
      role: "USER",
      name: "User"
    });

    const { requireInternalAccess } = await import("@/lib/internal/auth");
    await expect(requireInternalAccess()).rejects.toThrow("redirect:/dashboard");
  });

  it("redirects anonymous to sign-in", async () => {
    const { requirePageUser } = await import("@/lib/auth/session");
    (requirePageUser as any).mockRejectedValue(new Error("redirect:/sign-in"));

    const { requireInternalAccess } = await import("@/lib/internal/auth");
    await expect(requireInternalAccess()).rejects.toThrow("redirect:/sign-in");
  });
});
