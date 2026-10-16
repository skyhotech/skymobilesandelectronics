import { expect, test } from "@playwright/test";

test("SKY loader follows server responses instead of video completion", async ({ page }) => {
  let release = () => {};
  let pending = Promise.resolve();
  let requested = false;
  await page.route("**/hr/api/session/", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { user: null, csrfToken: "test-only-token" } });
      return;
    }
    requested = true;
    await pending;
    await route.fulfill({ status: 400, json: { detail: "Test-only invalid credentials." } });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/hr/login");
  const loader = page.getByRole("status", { name: "Loading page", exact: true });
  await expect(loader).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill("loader-test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  const startRequest = async () => {
    requested = false;
    pending = new Promise<void>(resolve => { release = resolve; });
    await signIn.click();
    await expect.poll(() => requested).toBe(true);
    await expect(loader).toBeVisible();
  };
  await startRequest();
  const video = loader.locator("video");
  await expect(video).toHaveAttribute("loop");
  await expect(video).toHaveAttribute("src", "/videos/loader-4k.mp4");
  for (const [width, height] of [[1440, 810], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const frame = await video.boundingBox();
    expect(frame!.width / frame!.height).toBeCloseTo(width < 768 ? 9 / 16 : 16 / 9, 2);
    expect(frame!.width).toBeGreaterThanOrEqual(width - 1);
    expect(frame!.height).toBeGreaterThanOrEqual(height - 1);
  }
  // Neither the end of a video nor playback failure completes a server request.
  await video.dispatchEvent("ended");
  await expect(loader).toBeVisible();
  await video.dispatchEvent("error");
  await expect(loader).toBeVisible();
  release();
  await expect(loader).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByText("Test-only invalid credentials.", { exact: true })).toBeVisible();
  // A new request starts its own loader and need not finish a playback cycle.
  await startRequest();
  await expect(video).toHaveAttribute("loop");
  release();
  await expect(loader).toHaveCount(0, { timeout: 2000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startRequest();
  await expect(video).not.toHaveAttribute("loop");
  await expect(video).toHaveJSProperty("paused", true);
  release();
  await expect(loader).toHaveCount(0, { timeout: 2000 });
});
