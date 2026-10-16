import { expect, test } from "@playwright/test";

test("SKY loader finishes every playback and also waits for the server", async ({ page }) => {
  test.setTimeout(90000);
  let release = () => {};
  let slow = false;
  let pending = Promise.resolve();
  await page.route("**/hr/api/session/", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { user: null, csrfToken: "test-only-token" } });
      return;
    }
    if (slow) await pending;
    await route.fulfill({ status: 400, json: { detail: "Test-only invalid credentials." } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/hr/login");
  const loader = page.getByRole("status", { name: "Loading page", exact: true });
  await expect(loader).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill("loader-test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  await signIn.click();
  await expect(loader).toBeVisible();
  const video = loader.locator("video");
  await expect(video).not.toHaveAttribute("loop");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
  await expect(page.getByText("Test-only invalid credentials.", { exact: true })).toBeVisible();
  await expect(loader).toBeVisible();
  await video.evaluate((element: HTMLVideoElement) => element.addEventListener("ended", () => { document.documentElement.dataset.loaderFinished = "true"; }, { once: true }));
  await expect(loader).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator("html")).toHaveAttribute("data-loader-finished", "true");
  slow = true;
  pending = new Promise<void>(resolve => { release = resolve; });
  await signIn.click();
  await expect(loader).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(3);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.ended), { timeout: 15000 }).toBe(true);
  await expect(loader).toBeVisible();
  release();
  await expect(loader).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  slow = false;
  await signIn.click();
  await expect(loader).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let videoFailed = false;
  await page.route("**/videos/loader.mp4", route => { videoFailed = true; return route.abort(); });
  await signIn.click();
  await expect.poll(() => videoFailed).toBe(true);
  await expect(loader).toHaveCount(0, { timeout: 12000 });
});
