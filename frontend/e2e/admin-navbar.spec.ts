import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("admin logo and top navigation stay visible while scrolling", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Brands", exact: true }).click();
  const header = page.getByRole("banner", { name: "Management navigation" });
  const logo = header.getByRole("img", { name: "SKY Mobile & Electronics", exact: true });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" }));
    await expect(header).toBeInViewport();
    await expect(logo).toBeInViewport();
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toBeInViewport();
    expect(Math.abs((await header.boundingBox())!.y)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 768) {
      const sidebar = await page.getByRole("complementary", { name: "Management sidebar" }).boundingBox();
      const bar = (await header.boundingBox())!;
      expect(sidebar!.y).toBeGreaterThanOrEqual(bar.height - 1);
    }
  }
  await header.getByRole("link", { name: "SKY management home" }).click();
  await expect(page).toHaveURL(/\/management\/admin$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/management\/admin\/login/);
});
