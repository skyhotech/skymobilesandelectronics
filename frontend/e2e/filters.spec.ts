import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 10000, trace: "off", screenshot: "off", video: "off" });
test("directory, admin product and storefront filters work together", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  test.setTimeout(90000);
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const headers = { "X-CSRFToken": (await (await page.request.get("/management/api/session/")).json()).csrfToken };
  const tag = `qa-filters-${Date.now()}`;
  let brand = 0, category = 0;
  const products: number[] = [];
  try {
    const br = await page.request.post("/management/api/brands/", { headers, data: { name: tag, slug: tag, is_active: true, show_on_homepage: false } });
    expect(br.status()).toBe(201); brand = (await br.json()).id;
    const ca = await page.request.post("/management/api/categories/", { headers, data: { name: tag, slug: tag, is_active: true, show_on_homepage: false } });
    expect(ca.status()).toBe(201); category = (await ca.json()).id;
    for (const [suffix, price, active] of [["a", "100.01", true], ["b", "200.00", true], ["draft", "150.00", false]] as const) {
      const pr = await page.request.post("/management/api/products/", { headers, data: { name: `${tag}-${suffix}`, slug: `${tag}-${suffix}`, sku: `${tag}-${suffix}`, brand, category, price, is_active: active } });
      expect(pr.status()).toBe(201); products.push((await pr.json()).id);
    }
    for (const section of ["brands", "categories"]) {
      await page.goto(`/management/admin/${section}`);
      await page.getByRole("searchbox", { name: `Search ${section}`, exact: true }).fill(tag);
      await page.getByRole("button", { name: "Filters", exact: true }).click();
      await page.getByRole("combobox", { name: "Homepage setting", exact: true }).selectOption("enabled");
      await expect(page.getByText(`No matching ${section}`, { exact: true })).toBeVisible();
      await page.getByRole("combobox", { name: "Homepage setting", exact: true }).selectOption("disabled");
      await page.getByRole("combobox", { name: "Image", exact: true }).selectOption("missing");
      await page.getByRole("combobox", { name: "Sort directory", exact: true }).selectOption("-name");
      for (const width of [390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole("button", { name: "Clear all filters", exact: true })).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.keyboard.press("Escape");
      if (section === "brands") {
        const card = page.locator(`[data-brand-row="${brand}"]`);
        await expect(card).toBeVisible();
        await expect(card.getByRole("button", { name: `Drag ${tag}`, exact: true })).toBeDisabled();
      } else await expect(page.getByRole("link", { name: `Open ${tag}`, exact: true })).toBeVisible();
      await page.getByRole("button", { name: /Filters/ }).click();
      await page.getByRole("button", { name: "Clear all filters", exact: true }).click();
      await expect(page.getByRole("searchbox", { name: `Search ${section}`, exact: true })).toHaveValue("");
      await page.keyboard.press("Escape");
    }
    await page.goto(`/management/admin/brands?brand=${brand}`);
    const form = page.getByRole("form", { name: "Product filters" });
    await form.getByLabel("Product status").selectOption("inactive");
    await form.getByLabel("Product category").selectOption(String(category));
    await form.getByLabel(/Minimum price/).fill("150");
    await form.getByLabel(/Maximum price/).fill("150");
    await form.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("row").filter({ hasText: `${tag}-draft` })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: `${tag}-a` })).toHaveCount(0);
    await form.getByLabel(/Minimum price/).fill("300");
    await form.getByRole("button", { name: "Apply filters" }).click();
    await expect(form.getByRole("alert")).toContainText("Maximum must be at least minimum");
    await form.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("row").filter({ hasText: `${tag}-a` })).toBeVisible();
    await page.goto("/products");
    await page.getByRole("combobox", { name: "Brand", exact: true }).selectOption(tag);
    await page.getByRole("combobox", { name: "Category", exact: true }).selectOption(tag);
    await page.getByLabel(/Minimum price/).fill("100.01");
    await page.getByLabel(/Maximum price/).fill("100.01");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("link", { name: `${tag}-a`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `${tag}-b`, exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: `${tag}-draft`, exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel(/Minimum price/)).toHaveValue("100.01");
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("link", { name: "Clear", exact: true }).click();
    await expect(page.getByLabel(/Minimum price/)).toHaveValue("");
    await page.goto(`/products?min_price=200&max_price=100`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Maximum must be at least minimum");
  } finally {
    for (const id of products) expect((await page.request.delete(`/management/api/products/${id}/`, { headers })).status()).toBe(204);
    if (category) expect((await page.request.delete(`/management/api/categories/${category}/`, { headers })).status()).toBe(204);
    if (brand) expect((await page.request.delete(`/management/api/brands/${brand}/`, { headers })).status()).toBe(204);
  }
});
