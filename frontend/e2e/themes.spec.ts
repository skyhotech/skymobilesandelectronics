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
  const homepage = await page.request.get("/");
  expect(homepage.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(homepage.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect((await page.request.get("/management/admin/themes")).headers()["x-frame-options"]).toBe("DENY");
  const card = page.getByRole("article", { name: "Default theme preview card" });
  await expect(page.frameLocator('iframe[title="Default theme homepage preview"]').locator("#hero")).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("radio", { name: "Default theme", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.reload();
  await expect(page.getByRole("radio", { name: "Default theme", exact: true })).toBeChecked();
  await expect(page.getByRole("link", { name: /View current homepage/ })).toHaveAttribute("href", "/");
  await page.getByRole("button", { name: "Apply theme", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Default theme is already active");
  await page.getByRole("heading", { name: "Themes", exact: true }).click();
  await card.hover({ position: { x: 30, y: 50 } });
  await expect.poll(() => card.evaluate(element => element.style.getPropertyValue("--tilt-y"))).not.toBe("0deg");
  await page.getByRole("button", { name: "Apply theme", exact: true }).focus();
  await expect.poll(() => card.evaluate(element => element.style.getPropertyValue("--tilt-y"))).toBe("0deg");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transform)).toBe("none");
  await page.screenshot({ path: "../.run/theme-preview-desktop.png", fullPage: true });
});
