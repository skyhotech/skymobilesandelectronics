import { expect, test } from "@playwright/test";

test("password visibility toggles without submitting and login fits smaller screens", async ({ page }) => {
  let submissions = 0;
  await page.route("**/management/api/session/", async (route) => {
    if (route.request().method() === "POST") submissions++;
    await route.fulfill({ json: { user: null, csrfToken: "ui-test-only" } });
  });
  await page.goto("/management/admin/login");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("visibility-test-only");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("visibility-test-only");
  const hide = page.getByRole("button", { name: "Hide password", exact: true });
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await hide.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("visibility-test-only");
  expect(submissions).toBe(0);
  await password.clear();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "../.run/admin-login-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "../.run/admin-login-mobile.png", fullPage: true });
});
