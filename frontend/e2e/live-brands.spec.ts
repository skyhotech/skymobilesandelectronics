import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("admin brand changes appear in an already-open homepage without navigation", async ({ page, context }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  test.setTimeout(120000);
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const session = await (await page.request.get("/management/api/session/")).json();
  const headers = { "X-CSRFToken": session.csrfToken };
  const published = await (await page.request.get("/catalog/brands/")).json();
  const logo = published[0]?.logo_url;
  test.skip(!logo, "Requires an existing published brand image to reuse without modifying media.");
  const name = `qa-live-brand-${Date.now()}`;
  const store = await context.newPage();
  let id: number | undefined;
  try {
    await store.goto("/");
    const navigations: string[] = [];
    store.on("request", request => { if (request.isNavigationRequest()) navigations.push(request.url()); });
    const created = await page.request.post("/management/api/brands/", {
      headers, data: { name, slug: name, logo_url: logo, is_active: true, show_on_homepage: true, display_order: 0 },
    });
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    await expect(store.locator("#brands").getByTitle(name, { exact: true })).toBeVisible({ timeout: 15000 });
    expect((await page.request.patch(`/management/api/brands/${id}/`, { headers, data: { name: `${name}-edited` } })).status()).toBe(200);
    await expect(store.locator("#brands").getByTitle(`${name}-edited`, { exact: true })).toBeVisible({ timeout: 15000 });
    await store.waitForResponse(response => response.url().includes("/catalog/brands/") && response.status() === 304, { timeout: 15000 });
    await store.route("**/catalog/brands/", route => route.fulfill({ status: 503, json: { detail: "Test outage" } }));
    await expect(store.getByText("Brand updates are temporarily unavailable. Retrying automatically.")).toBeVisible({ timeout: 15000 });
    await expect(store.locator("#brands").getByTitle(`${name}-edited`, { exact: true })).toBeVisible();
    await store.unroute("**/catalog/brands/");
    await expect(store.getByText("Brand updates are temporarily unavailable. Retrying automatically.")).toHaveCount(0, { timeout: 15000 });
    expect((await page.request.patch(`/management/api/brands/${id}/`, { headers, data: { show_on_homepage: false } })).status()).toBe(200);
    await expect(store.locator("#brands").getByTitle(`${name}-edited`, { exact: true })).toHaveCount(0, { timeout: 15000 });
    expect((await page.request.patch(`/management/api/brands/${id}/`, { headers, data: { show_on_homepage: true } })).status()).toBe(200);
    await expect(store.locator("#brands").getByTitle(`${name}-edited`, { exact: true })).toBeVisible({ timeout: 15000 });
    expect((await page.request.delete(`/management/api/brands/${id}/`, { headers })).status()).toBe(204);
    id = undefined;
    await expect(store.locator("#brands").getByTitle(`${name}-edited`, { exact: true })).toHaveCount(0, { timeout: 15000 });
    expect(navigations).toEqual([]);
  } finally {
    if (id !== undefined) expect((await page.request.delete(`/management/api/brands/${id}/`, { headers })).status()).toBe(204);
    await store.close();
    await page.request.delete("/management/api/session/", { headers });
  }
});
