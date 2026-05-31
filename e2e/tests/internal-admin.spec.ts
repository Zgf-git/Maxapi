import { test, expect } from "@playwright/test";

test.describe("internal admin access", () => {
  test("admin can access internal dashboard", async ({ page }) => {
    await page.goto("/internal");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.locator("text=Live snapshot of users")).toBeVisible();
  });

  test("admin can view users list", async ({ page }) => {
    await page.goto("/internal/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.locator("text=e2e-user@maxapi.test")).toBeVisible();
  });

  test("admin can search users", async ({ page }) => {
    await page.goto("/internal/users");
    await page.fill('input[name="search"]', "e2e-user");
    await page.press('input[name="search"]', "Enter");
    await page.waitForTimeout(1000);

    await expect(page.locator("text=e2e-user@maxapi.test")).toBeVisible();
  });

  test("admin can view user details", async ({ page }) => {
    await page.goto("/internal/users");
    await page.click("text=e2e-user@maxapi.test");
    await page.waitForURL(/.*\/internal\/users\/.+/);
    await expect(page.locator("text=e2e-user@maxapi.test")).toBeVisible();
  });

  test("admin can view finance revenue page", async ({ page }) => {
    await page.goto("/internal/finance/revenue");
    await expect(page.getByRole("heading", { name: "Revenue", exact: true })).toBeVisible();
  });

  test("admin can view finance top-ups page", async ({ page }) => {
    await page.goto("/internal/finance/top-ups");
    await expect(page.getByRole("heading", { name: "Top-ups" })).toBeVisible();
  });

  test("admin can view operations page", async ({ page }) => {
    await page.goto("/internal/operations");
    await expect(page.getByRole("heading", { name: "Live" })).toBeVisible();
  });

  test("admin can view routing providers page", async ({ page }) => {
    await page.goto("/internal/routing/providers");
    await expect(page.getByRole("heading", { name: "Upstreams" })).toBeVisible();
  });

  test("admin can view audit log page", async ({ page }) => {
    await page.goto("/internal/audit");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  });

  test("admin can view growth codes page", async ({ page }) => {
    await page.goto("/internal/growth/codes");
    await expect(page.getByRole("heading", { name: "Redemption codes" })).toBeVisible();
  });
});

test.describe("internal RBAC - regular user blocked", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("regular user is redirected from internal pages", async ({ page }) => {
    await page.goto("/internal");
    await expect(page).toHaveURL("/dashboard");
  });

  test("regular user cannot access internal users", async ({ page }) => {
    await page.goto("/internal/users");
    await expect(page).toHaveURL("/dashboard");
  });
});
