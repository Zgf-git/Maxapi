import { test as setup, expect } from "@playwright/test";
import { TEST_USER, TEST_ADMIN, TEST_OWNER } from "../helpers";

const authDir = "e2e/.auth";

setup("authenticate as regular user", async ({ page }) => {
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
  await expect(page.locator("text=Developer console overview")).toBeVisible();
  await page.context().storageState({ path: `${authDir}/user.json` });
});

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', TEST_ADMIN.email);
  await page.fill('input[name="password"]', TEST_ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
  await expect(page.locator("text=Developer console overview")).toBeVisible();
  await page.context().storageState({ path: `${authDir}/admin.json` });
});

setup("authenticate as owner", async ({ page }) => {
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', TEST_OWNER.email);
  await page.fill('input[name="password"]', TEST_OWNER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
  await expect(page.locator("text=Developer console overview")).toBeVisible();
  await page.context().storageState({ path: `${authDir}/owner.json` });
});
