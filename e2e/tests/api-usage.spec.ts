import { test, expect } from "@playwright/test";

test.describe("API authentication", () => {
  test("request without API key returns 401", async ({ request }) => {
    const response = await request.post("/v1/chat/completions", {
      data: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error?.code).toBe("unauthorized");
  });

  test("request with invalid API key returns 401", async ({ request }) => {
    const response = await request.post("/v1/chat/completions", {
      headers: { Authorization: "Bearer invalid-key-12345" },
      data: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error?.code).toBe("invalid_api_key");
  });
});

test.describe("API request with valid key", () => {
  test("valid API key passes auth (upstream may fail)", async ({ page, request }) => {
    // Create API key via UI
    await page.goto("/dashboard/api-keys");
    await page.click("text=Create API key");
    await page.fill('input[name="name"]', "API Usage Test Key");
    await page.click('button[type="submit"]:has-text("Create key")');

    // Extract the key
    await expect(page.locator("text=Copy your new key now")).toBeVisible();
    const keyText = await page.locator("p.break-all.font-mono").textContent();
    const apiKey = keyText?.trim() ?? "";
    expect(apiKey).toContain("mk_live_");

    await page.click("text=Done");

    // Make API request
    const response = await request.post("/v1/chat/completions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      data: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello, this is an E2E test" }],
        stream: false,
      },
    });

    // Should NOT be 401 (auth passed)
    // With fake OPENAI_API_KEY, upstream will fail but auth is valid
    expect(response.status()).not.toBe(401);

    // Request log should exist
    await page.goto("/dashboard/requests");
    await page.waitForTimeout(2000);

    // The request should appear in logs
    const hasRequestLog = await page.locator("text=gpt-4").first().isVisible().catch(() => false);
    expect(hasRequestLog).toBe(true);
  });

  test("API key is recorded in request logs", async ({ page, request }) => {
    // Create key
    await page.goto("/dashboard/api-keys");
    await page.click("text=Create API key");
    await page.fill('input[name="name"]', "Log Test Key");
    await page.click('button[type="submit"]:has-text("Create key")');

    const keyText = await page.locator("p.break-all.font-mono").textContent();
    const apiKey = keyText?.trim() ?? "";
    await page.click("text=Done");

    // Make a non-streaming request
    await request.post("/v1/chat/completions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      data: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test message" }],
        stream: false,
      },
    });

    // Check logs show the request
    await page.goto("/dashboard/requests");
    await page.waitForTimeout(2000);

    // Should see the model name in the logs
    const hasGpt4o = await page.locator("text=gpt-4o").first().isVisible().catch(() => false);
    expect(hasGpt4o).toBe(true);
  });
});

test.describe("model listing", () => {
  test("can list available models", async ({ request }) => {
    const response = await request.get("/v1/models");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
