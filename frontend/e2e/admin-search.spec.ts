import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("global search opens records and storefront search ignores letter case", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const headers = { "X-CSRFToken": (await (await page.request.get("/management/api/session/")).json()).csrfToken };
  const tag = `qa-search-${Date.now()}`;
  let brand = 0, category = 0, product = 0;
  try {
    const br = await page.request.post("/management/api/brands/", { headers, data: { name: tag, slug: tag, is_active: true } });
    expect(br.status()).toBe(201); brand = (await br.json()).id;
    const ca = await page.request.post("/management/api/categories/", { headers, data: { name: `${tag}-phones`, slug: `${tag}-phones`, is_active: true } });
    expect(ca.status()).toBe(201); category = (await ca.json()).id;
    const pr = await page.request.post("/management/api/products/", { headers, data: { name: `${tag}-Smartphone`, slug: `${tag}-smartphone`, sku: tag, brand, category, price: "100.00", is_active: true } });
    expect(pr.status()).toBe(201); product = (await pr.json()).id;
    const search = page.getByRole("combobox", { name: "Search administration" });
    const results = page.getByRole("listbox", { name: "Admin search results" });
    await search.fill(tag.toUpperCase());
    await page.getByLabel("Search result type").selectOption("product");
    await expect(results.getByRole("option")).toHaveCount(1);
    await results.getByRole("option").filter({ hasText: `${tag}-Smartphone` }).click();
    await expect(page).toHaveURL(new RegExp(`brand=${brand}&search=`));
    await expect(page.getByRole("heading", { name: `${tag} products` })).toBeVisible();
    await expect(page.getByRole("cell").getByText(`${tag}-Smartphone`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: `${tag} products` })).toBeVisible();
    await search.fill(`${tag}-PHONES`);
    await results.getByRole("option").filter({ hasText: `${tag}-phones` }).click();
    await expect(page).toHaveURL(new RegExp(`/categories/${category}$`));
    await search.fill("DASHBOARD");
    await expect(results.getByRole("option", { name: "Dashboard Page" })).toBeVisible();
    await search.press("Enter");
    await expect(page).toHaveURL(/\/management\/admin\/dashboard$/);
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search products" }).fill(`SHOW ME ${tag.toUpperCase()} PHONES`);
    await page.getByRole("searchbox", { name: "Search products" }).press("Enter");
    await expect(page.getByRole("link", { name: `${tag}-Smartphone`, exact: true })).toBeVisible();
  } finally {
    if (product) expect((await page.request.delete(`/management/api/products/${product}/`, { headers })).status()).toBe(204);
    if (category) expect((await page.request.delete(`/management/api/categories/${category}/`, { headers })).status()).toBe(204);
    if (brand) expect((await page.request.delete(`/management/api/brands/${brand}/`, { headers })).status()).toBe(204);
  }
});
