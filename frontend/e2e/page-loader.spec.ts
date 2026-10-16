import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("video loader waits for the server and clears on success and failure", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading page", exact: true })).toHaveCount(0);
  let release = () => {};
  let pending = new Promise<void>(resolve => { release = resolve; });
  let fail = false;
  await page.route("**/management/api/inventory/", async route => {
    await pending;
    await route.fulfill(fail ? { status: 503, json: { detail: "Inventory service is unavailable." } } : { json: { columns: [], rows: [] } });
  });
  await page.getByRole("navigation", { name: "Management sections" }).getByRole("link", { name: "Inventory", exact: true }).click();
  const loader = page.getByRole("status", { name: "Loading page", exact: true });
  await expect(loader).toBeVisible();
  const video = loader.locator("video");
  await expect(video).toHaveAttribute("src", "/videos/loader.mp4");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await expect(video).toHaveJSProperty("muted", true);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(video).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.screenshot({ path: "../.run/page-video-loader.png" });
  release();
  await expect(loader).toHaveCount(0);
  await expect(page.getByText("APX returned no inventory records for the configured report scope.")).toBeVisible();
  fail = true;
  pending = new Promise<void>(resolve => { release = resolve; });
  await page.getByRole("button", { name: "Refresh inventory", exact: true }).click();
  await expect(loader).toBeVisible();
  release();
  await expect(loader).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Inventory service is unavailable");
});
