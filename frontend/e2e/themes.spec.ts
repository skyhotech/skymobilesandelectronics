import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("Themes sits below Dashboard with the existing default theme selected", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/themes");
  await expect(page).toHaveURL(/\/management\/admin\/login/);
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Themes", exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Management sections" });
  await expect(navigation.getByRole("link").nth(0)).toContainText("Dashboard");
  await expect(navigation.getByRole("link").nth(1)).toContainText("Themes");
  await expect(navigation.getByRole("link", { name: "Themes", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("radio", { name: "Default theme", exact: true })).toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(1);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("radio", { name: "Default theme", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.reload();
  await expect(page.getByRole("radio", { name: "Default theme", exact: true })).toBeChecked();
  await expect(page.getByRole("link", { name: /View current homepage/ })).toHaveAttribute("href", "/");
});
