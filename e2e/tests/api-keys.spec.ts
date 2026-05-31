import { test, expect } from "@playwright/test";

test.describe("API key management", () => {
  test("can create a new API key", async ({ page }) => {
    await page.goto("/dashboard/api-keys");

    // Open create dialog
    await page.click("text=Create API key");
    await expect(page.locator("text=Create a new API key")).toBeVisible();

    // Fill form
    await page.fill('input[name="name"]', "E2E Test Key");
    await page.click('button[type="submit"]:has-text("Create key")');

    // Wait for reveal dialog
    await expect(page.locator("text=Copy your new key now")).toBeVisible();

    // Verify key format
    const keyText = await page.locator("p.break-all.font-mono").textContent();
    expect(keyText).toContain("mk_live_");

    // Close dialog
    await page.click("text=Done");

    // Verify key appears in table
    await expect(page.locator("text=E2E Test Key")).toBeVisible();
  });

  test("can create API key with rate limits", async ({ page }) => {
    await page.goto("/dashboard/api-keys");

    await page.click("text=Create API key");
    await page.fill('input[name="name"]', "E2E Limited Key");
    await page.fill('input[name="requestsPerMinuteLimit"]', "10");
    await page.fill('input[name="concurrentRequestsLimit"]', "2");
    await page.fill('input[name="dailyRequestLimit"]', "100");
    await page.click('button[type="submit"]:has-text("Create key")');

    await expect(page.locator("text=Copy your new key now")).toBeVisible();
    await page.click("text=Done");

    await expect(page.locator("text=E2E Limited Key")).toBeVisible();
  });

  test("can disable and re-enable an API key", async ({ page }) => {
    await page.goto("/dashboard/api-keys");

    // Create a key first
    await page.click("text=Create API key");
    await page.fill('input[name="name"]', "E2E Toggle Key");
    await page.click('button[type="submit"]:has-text("Create key")');
    await page.click("text=Done");

    // Find the row with our key and disable it
    const keyRow = page.locator("tr", { has: page.locator("text=E2E Toggle Key") });
    await keyRow.locator('select[name="isEnabled"]').selectOption("false");
    await keyRow.locator("button:has-text('Save controls')").click();

    // Wait for re-render and verify Disabled badge appears in this row (not the <option>)
    await expect(keyRow.locator("span:has-text('Disabled')")).toBeVisible({ timeout: 10000 });

    // Re-enable
    await keyRow.locator('select[name="isEnabled"]').selectOption("true");
    await keyRow.locator("button:has-text('Save controls')").click();

    // Verify Active badge appears in this row (not the <option>)
    await expect(keyRow.locator("span:has-text('Active')")).toBeVisible({ timeout: 10000 });
  });

  test("can revoke an API key", async ({ page }) => {
    await page.goto("/dashboard/api-keys");

    // Create a key
    await page.click("text=Create API key");
    await page.fill('input[name="name"]', "E2E Revoke Key");
    await page.click('button[type="submit"]:has-text("Create key")');
    await page.click("text=Done");

    // Find and click Revoke button
    const keyRow = page.locator("tr", { has: page.locator("text=E2E Revoke Key") });
    await keyRow.locator("button:has-text('Revoke')").click();

    // Confirm in dialog
    await expect(page.locator("text=Revoke this API key?")).toBeVisible();
    await page.click("text=Confirm revoke");

    // Should show Revoked status
    await expect(page.locator("text=Revoked").first()).toBeVisible();
  });
});
