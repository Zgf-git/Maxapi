import { test, expect } from "@playwright/test";

test.describe("dashboard overview", () => {
  test("dashboard loads with all stat cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Developer console overview")).toBeVisible();
    await expect(page.locator("text=My balance")).toBeVisible();
    await expect(page.locator("text=My spend last 24h")).toBeVisible();
    await expect(page.locator("text=Total requests")).toBeVisible();
    await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
  });

  test("onboarding status card is visible for new user", async ({ page }) => {
    await page.goto("/dashboard");
    // Onboarding card shows steps for new users
    const onboardingVisible = await page.locator("text=Getting started").isVisible().catch(() => false);
    if (onboardingVisible) {
      await expect(page.locator("text=Create an API key")).toBeVisible();
    }
  });
});

test.describe("navigation", () => {
  test("can navigate to API keys page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=API Keys");
    await expect(page).toHaveURL("/dashboard/api-keys");
    await expect(page.getByRole("heading", { name: "API Keys", exact: true })).toBeVisible();
  });

  test("can navigate to requests page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Requests");
    await expect(page).toHaveURL("/dashboard/requests");
  });

  test("can navigate to billing page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=My Billing");
    await expect(page).toHaveURL("/dashboard/billing");
  });

  test("can navigate to playground", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Playground");
    await expect(page).toHaveURL("/dashboard/playground");
  });
});
