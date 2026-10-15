import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });

test("login displays a temporary service error and allows retry", async ({ page }) => {
  await page.route("**/management/api/session/", async route => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 503, headers: { "Retry-After": "10" }, json: { detail: "Sign-in is temporarily unavailable. Please try again shortly." } });
    } else await route.fulfill({ json: { user: null, csrfToken: "ui-test-only" } });
  });
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill("test-only");
  await page.getByLabel("Password", { exact: true }).fill("test-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sign-in is temporarily unavailable" })).toHaveText("Sign-in is temporarily unavailable. Please try again shortly.");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/management\/admin\/login/);
});

test("owner can sign in and out with live Redis throttling", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_USERNAME || !process.env.SKY_ADMIN_PASSWORD, "Requires local owner test credentials in process environment.");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/management\/admin\/login/);
});
