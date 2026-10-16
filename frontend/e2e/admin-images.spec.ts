import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("admin brand and category images load their actual files", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  for (const section of ["brands", "categories"]) {
    await page.getByRole("navigation", { name: "Management sections" }).getByRole("link", { name: section === "brands" ? "Brands" : "Categories", exact: true }).click();
    await expect(page.getByRole("heading", { name: section === "brands" ? "Brands" : "Categories", exact: true })).toBeVisible();
    const images = page.getByRole("main").locator("article img");
    await expect(images.first()).toBeVisible();
    const count = await images.count();
    for (let index = 0; index < count; index++) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      const source = await image.getAttribute("src");
      expect(source).not.toContain("image-placeholder");
      const response = await page.request.get(source!);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/^image\//);
    }
  }
});
