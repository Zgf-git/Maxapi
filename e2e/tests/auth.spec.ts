import { test, expect } from "@playwright/test";

test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page loads with sign-in form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("text=Access your dashboard")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test("unauthenticated user is redirected from internal", async ({ page }) => {
    await page.goto("/internal");
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test("registration tab is available when self-signup enabled", async ({ page }) => {
    await page.goto("/sign-in");
    await page.click("text=Create account");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("registration creates a new account", async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e-new-${timestamp}@maxapi.test`;

    await page.goto("/sign-in");
    await page.click("text=Create account");
    await page.fill('input[name="name"]', "E2E New User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "TestPass123!");
    await page.click('button[type="submit"]');

    // Wait for success or redirect
    await page.waitForTimeout(2000);

    // Either we see success message, or we're redirected to sign-in (if no email verification)
    const hasSuccess = await page.locator("text=Account created").isVisible().catch(() => false);
    const hasPreviewLink = await page.locator("text=Open verification link").isVisible().catch(() => false);

    if (hasPreviewLink) {
      // Email verification required - click the preview link
      await page.click("text=Open verification link");
      // After verification, page shows "Email verified" with "Return to sign in" button
      await page.waitForTimeout(2000);
    }

    // If on "Email verified" page, click return to sign in
    const hasReturnButton = await page.locator("text=Return to sign in").isVisible().catch(() => false);
    if (hasReturnButton) {
      await page.click("text=Return to sign in");
      // Wait for sign-in page to fully load
      await page.waitForURL("/sign-in", { timeout: 10000 });
      await expect(page.locator('input[name="email"]')).toBeVisible();
    }

    // Sign in with the new account
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "TestPass123!");
    await page.click('button[type="submit"]');

    // Should eventually reach dashboard
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await expect(page.locator("text=Developer console overview")).toBeVisible();
  });
});

test.describe("authenticated user", () => {
  test("dashboard shows user information", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Developer console overview")).toBeVisible();
    await expect(page.locator("text=My balance")).toBeVisible();
  });

  test("sign-out redirects to login page", async ({ page }) => {
    await page.goto("/dashboard");
    // Sign out button is typically in the user menu or header
    // The exact selector depends on the layout component
    // Try to find and click sign out
    await page.goto("/api/auth/signout");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    // After sign-out, NextAuth redirects to sign-in page by default
    await expect(page).toHaveURL(/.*sign-in/);
  });
});
