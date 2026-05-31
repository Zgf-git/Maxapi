export const TEST_USER = {
  email: "e2e-user@maxapi.test",
  password: "TestPass123!",
};

export const TEST_ADMIN = {
  email: "e2e-admin@maxapi.test",
  password: "TestPass123!",
};

export const TEST_OWNER = {
  email: "e2e-owner@maxapi.test",
  password: "TestPass123!",
};

export async function waitForPageLoad(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
}
