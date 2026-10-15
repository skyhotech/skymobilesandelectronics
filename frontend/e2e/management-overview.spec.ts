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
