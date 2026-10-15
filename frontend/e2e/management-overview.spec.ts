import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("dashboard totals are real and brand controls stay visible while cards scroll", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const data = await (await page.request.get("/management/api/overview/")).json();
  for (const kind of ["brands", "categories", "products"]) {
    await expect(page.getByRole("article", { name: `${kind} overview` }).locator("dl > div").filter({ hasText: `Total ${kind}` }).locator("dd")).toHaveText(String(data[kind].total));
  }
  await expect(page.getByRole("progressbar", { name: "Visible products", exact: true })).toHaveJSProperty("value", data.products.published);
  await expect(page.getByRole("link", { name: "Explore themes", exact: false })).toHaveAttribute("href", "/management/admin/themes");
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) await page.screenshot({ path: `../.run/dashboard-rebuilt-${width}.png`, fullPage: true });
  }
  const nav = page.getByRole("navigation", { name: "Management sections" });
  await expect(nav.getByRole("link").first()).toHaveText(/Dashboard/);
  await page.getByRole("button", { name: "Refresh dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Manage brands", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brands", exact: true })).toBeVisible();
  const cards = page.getByRole("region", { name: "Scrollable brand cards", exact: true });
  await expect(cards.getByRole("article").first()).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const title = page.getByRole("heading", { name: "Brands", exact: true });
    const search = page.getByRole("searchbox", { name: "Search brands", exact: true });
    const before = (await title.boundingBox())!;
    const position = await cards.evaluate(element => { element.scrollTop = 400; return element.scrollTop; });
    expect(position).toBeGreaterThan(0);
    expect(Math.abs((await title.boundingBox())!.y - before.y)).toBeLessThan(1);
    await expect(search).toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Brand directory", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Add brand", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await cards.boundingBox())!.height).toBeGreaterThan(80);
    const directory = page.getByRole("region", { name: "Scrollable brand directory", exact: true });
    expect((await directory.boundingBox())!.height).toBeGreaterThan(20);
    const directoryScroll = await directory.evaluate(element => { element.scrollTop = 100; return { overflow: element.scrollHeight > element.clientHeight, scrolled: element.scrollTop > 0 }; });
    if (directoryScroll.overflow) expect(directoryScroll.scrolled).toBe(true);
    if (width === 390 || width === 1440) await page.screenshot({ path: `../.run/brands-pinned-${width}.png`, fullPage: true });
    await cards.evaluate(element => { element.scrollTop = 0; });
  }
  await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/management\/admin\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
});

test("dashboard recent products open their brand panel and failed refresh keeps the last totals", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const headers = { "X-CSRFToken": (await (await page.request.get("/management/api/session/")).json()).csrfToken };
  const tag = `qa-overview-${Date.now()}`;
  let brand = 0, category = 0, product = 0;
  try {
    const br = await page.request.post("/management/api/brands/", { headers, data: { name: tag, slug: tag, is_active: true } });
    expect(br.status()).toBe(201); brand = (await br.json()).id;
    const ca = await page.request.post("/management/api/categories/", { headers, data: { name: tag, slug: tag, is_active: true } });
    expect(ca.status()).toBe(201); category = (await ca.json()).id;
    const pr = await page.request.post("/management/api/products/", { headers, data: { name: tag, slug: tag, sku: tag, brand, category, price: "12345.00", is_active: true } });
    expect(pr.status()).toBe(201); product = (await pr.json()).id;
    await page.getByRole("button", { name: "Refresh dashboard", exact: true }).click();
    const recent = page.getByRole("link").filter({ hasText: tag });
    await expect(recent).toBeVisible();
    await page.route("**/management/api/overview/", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Temporarily unavailable"}' }));
    await page.getByRole("button", { name: "Refresh dashboard", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Showing the last loaded overview");
    await expect(recent).toBeVisible();
    await page.unroute("**/management/api/overview/");
    await page.getByRole("button", { name: "Refresh dashboard", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await recent.click();
    await expect(page).toHaveURL(new RegExp(`brands\\?brand=${brand}&search=`));
    await expect(page.getByRole("heading", { name: `${tag} products`, exact: true })).toBeVisible();
  } finally {
    if (product) expect((await page.request.delete(`/management/api/products/${product}/`, { headers })).status()).toBe(204);
    if (category) expect((await page.request.delete(`/management/api/categories/${category}/`, { headers })).status()).toBe(204);
    if (brand) expect((await page.request.delete(`/management/api/brands/${brand}/`, { headers })).status()).toBe(204);
  }
});
