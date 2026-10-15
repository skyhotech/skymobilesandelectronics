import { expect, test } from "@playwright/test";

test("login depth follows pointer, pauses for typing and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/management/api/session/", route => route.fulfill({ json: { user: null, csrfToken: "test-only" } }));
  await page.goto("/management/admin/login?next=%2Fmanagement%2Fadmin");
  const scene = page.getByRole("main");
  await expect(scene).toHaveAttribute("data-login-motion", "on");
  await page.mouse.move(100, 200);
  await expect.poll(() => scene.evaluate(el => el.style.getPropertyValue("--login-ry"))).not.toBe("0deg");
  const username = page.getByLabel("Username", { exact: true });
  await username.fill("typing-test");
  await expect.poll(() => scene.evaluate(el => el.style.getPropertyValue("--login-ry"))).toBe("0deg");
  await page.mouse.move(1200, 300);
  await expect(username).toHaveValue("typing-test");
  expect(await scene.evaluate(el => el.style.getPropertyValue("--login-ry"))).toBe("0deg");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-login-motion", "off");
  await page.mouse.move(100, 200);
  expect(await scene.evaluate(el => el.style.getPropertyValue("--login-ry"))).toBe("0deg");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
