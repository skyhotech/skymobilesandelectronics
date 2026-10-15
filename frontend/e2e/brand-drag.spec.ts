import { expect, test, type APIResponse } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("brand thumbnails and drag order persist and update the live homepage", async ({ page, context }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  test.setTimeout(120000);
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const headers = { "X-CSRFToken": (await (await page.request.get("/management/api/session/")).json()).csrfToken };
  const originals: { id: number; display_order: number }[] = [];
  let next: string | null = "/management/api/brands/";
  while (next) {
    const response: APIResponse = await page.request.get(next);
    expect(response.status()).toBe(200);
    const data: { results: { id: number; display_order: number }[]; next: string | null } = await response.json();
    originals.push(...data.results);
    next = data.next ? `/management/api/brands/?page=${new URL(data.next).searchParams.get("page")}` : null;
  }
  const published = await (await page.request.get("/catalog/brands/")).json();
  test.skip(!published[0]?.logo_url, "Requires an existing brand image to reuse.");
  const tag = `qa-brand-drag-${Date.now()}`;
  const ids: number[] = [];
  const store = await context.newPage();
  try {
    for (const suffix of ["a", "b"]) {
      const response = await page.request.post("/management/api/brands/", { headers, data: { name: `${tag}-${suffix}`, slug: `${tag}-${suffix}`, logo_url: published[0].logo_url, is_active: true, show_on_homepage: true, display_order: 0 } });
      expect(response.status()).toBe(201); ids.push((await response.json()).id);
    }
    await store.goto("/");
    await page.bringToFront();
    await page.getByRole("link", { name: "Brands", exact: true }).click();
    const first = page.locator(`[data-brand-row="${ids[0]}"]`);
    const second = page.locator(`[data-brand-row="${ids[1]}"]`);
    await expect(first.getByRole("img", { name: `${tag}-a logo` })).toBeVisible();
    expect(await first.getByRole("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const handle = page.getByRole("button", { name: `Drag ${tag}-b`, exact: true });
    await handle.hover(); await page.mouse.down();
    await page.mouse.move(20, 100, { steps: 8 });
    await expect(page.getByTestId("brand-drag-preview")).toBeVisible();
    await page.keyboard.press("Escape"); await page.mouse.up();
    await expect(page.getByTestId("brand-drag-preview")).toHaveCount(0);
    await handle.hover(); await page.mouse.down(); await first.hover();
    await expect(page.getByTestId("brand-drag-preview")).toBeVisible();
    const saved = page.waitForResponse(response => response.url().endsWith("/management/api/brands/move/") && response.request().method() === "POST");
    await page.mouse.up(); expect((await saved).status()).toBe(200);
    await expect(page.getByText("Brand order saved.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    const order = await page.locator("[data-brand-row]").evaluateAll(rows => rows.map(row => Number((row as HTMLElement).dataset.brandRow)));
    expect(order.indexOf(ids[1])).toBeLessThan(order.indexOf(ids[0]));
    await store.bringToFront();
    await expect.poll(async () => store.locator("#brands .brand-logo-card").evaluateAll(cards => cards.map(card => card.getAttribute("title")))).toEqual(expect.arrayContaining([`${tag}-a`, `${tag}-b`]));
    await expect.poll(async () => { const titles = await store.locator("#brands .brand-logo-card").evaluateAll(cards => cards.map(card => card.getAttribute("title"))); return titles.indexOf(`${tag}-b`) < titles.indexOf(`${tag}-a`); }).toBe(true);
  } finally {
    for (const id of ids) expect((await page.request.delete(`/management/api/brands/${id}/`, { headers })).status()).toBe(204);
    // The global reorder normalizes positions; restore pre-test owner-managed values.
    for (const original of originals) expect((await page.request.patch(`/management/api/brands/${original.id}/`, { headers, data: { display_order: original.display_order } })).status()).toBe(200);
    await store.close();
    await page.request.delete("/management/api/session/", { headers });
  }
});
