import { expect, test } from "@playwright/test";

test("catalog search has a genuine empty state and unknown products return 404", async ({ page, request }) => {
  await page.goto("/products?search=sky-no-matching-product-08c90542");
  await expect(page.getByRole("heading", { name: "Explore SKY products" })).toBeVisible();
  await expect(page.getByText("No products match your filters.", { exact: false })).toBeVisible();
  await page.getByLabel("Search products").fill("sky-no-matching-product-08c90542");
  await page.getByLabel("Sort by").selectOption("-price");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/ordering=-price/);
  expect((await request.get("/products/sky-missing-product-08c90542")).status()).toBe(404);
});

test("live Django product renders price, filters and detail without overflow", async ({ page }) => {
  const slug = process.env.SKY_CATALOG_TEST_SLUG;
  test.skip(!slug, "Set SKY_CATALOG_TEST_SLUG to an isolated active test product with INR 12345.00.");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/products?search=${encodeURIComponent(slug!)}`);
  // Fixture slug is also its name, so this queries real API data through SSR.
  const product = page.getByRole("link", { name: slug!, exact: true });
  await expect(product).toBeVisible();
  await expect(page.getByText("₹12,345.00", { exact: true })).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await product.click();
  await expect(page.getByRole("heading", { name: slug! })).toBeVisible();
  await expect(page).toHaveTitle(`${slug} | SKY Mobile & Electronics`);
  await expect(page.getByText("Online checkout is not available yet.", { exact: false })).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Explore SKY products" })).toBeVisible();
  await page.getByRole("link", { name: "SKY catalog test brand", exact: true }).click();
  await expect(page).toHaveURL(/brand=/);
  await expect(page.getByRole("link", { name: slug!, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
