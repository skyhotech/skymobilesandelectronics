import { expect, test } from "@playwright/test";

test.use({ trace: "off" });
test("nested category cards, URL navigation, drag order and live storefront", async ({
  page,
  context,
}) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const tag = `qa-cards-${Date.now()}`;
  const ids: number[] = [];
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Brands", exact: true })).toBeVisible();
  const session = await (await page.request.get("/management/api/session/")).json();
  const headers = { "X-CSRFToken": session.csrfToken };
  const store = await context.newPage();
  await store.goto("/");
  const navigations: string[] = [];
  store.on("request", (request) => {
    if (request.isNavigationRequest()) navigations.push(request.url());
  });
  try {
    for (const [suffix, parentIndex] of [
      ["root", null],
      ["other", null],
      ["child", 0],
      ["leaf", 2],
      ["sibling", 0],
    ] as const) {
      const response = await page.request.post("/management/api/categories/", {
        headers,
        data: {
          name: `${tag}-${suffix}`,
          slug: `${tag}-${suffix}`,
          parent: parentIndex === null ? null : ids[parentIndex],
          image_url: "/media/categories/artwork/earbuds.webp",
          is_active: true,
          show_on_homepage: true,
        },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    await page.bringToFront();
    for (const section of ["Brands", "Categories"]) {
      await page.getByRole("link", { name: section, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/management/admin/${section.toLowerCase()}$`), {
        timeout: 25000,
      });
    }
    await expect(page.getByText("Arrange category tree", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: `${tag}-root`, exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: `${tag}-child`, exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: `Open ${tag}-root`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/categories/${ids[0]}$`));
    await expect(page.getByRole("article", { name: `${tag}-leaf`, exact: true })).toHaveCount(0);
    const handle = page.getByRole("button", { name: `Drag ${tag}-sibling`, exact: true });
    const destination = page.getByRole("article", { name: `${tag}-child`, exact: true });
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(20, 100, { steps: 8 });
    await expect(page.getByTestId("category-drag-preview")).toBeVisible();
    await expect(page.getByTestId("category-drag-preview")).toContainText(`${tag}-sibling`);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.getByTestId("category-drag-preview")).toHaveCount(0);
    await handle.hover();
    await page.mouse.down();
    await destination.hover();
    await destination.hover();
    await page.mouse.up();
    await expect(page.getByRole("article").first()).toHaveAttribute("data-card-id", String(ids[4]));
    await page.getByRole("link", { name: `Open ${tag}-child`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/categories/${ids[2]}$`));
    await expect(page.getByRole("article", { name: `${tag}-leaf`, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("article", { name: `${tag}-leaf`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add category", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Parent category")).toHaveValue(String(ids[2]));
    await dialog.getByLabel("Name", { exact: true }).fill(`${tag}-new`);
    await dialog.getByLabel("Slug", { exact: true }).fill(`${tag}-new`);
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/management/api/categories/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Save category", exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    ids.push((await response.json()).id);
    await expect(dialog).toBeHidden();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/categories/${ids[0]}$`));
    await expect(page.getByRole("article").first()).toHaveAttribute("data-card-id", String(ids[4]));
    await page
      .getByRole("navigation", { name: "Category breadcrumbs" })
      .getByRole("link", { name: "Main categories" })
      .click();
    await expect(page).toHaveURL(/\/management\/admin\/categories$/);
    await store.bringToFront();
    await expect(store.locator(`#category-${ids[3]}`)).toBeVisible({ timeout: 20000 });
    expect(
      (
        await page.request.patch(`/management/api/categories/${ids[3]}/`, {
          headers,
          data: { name: `${tag}-renamed` },
        })
      ).status(),
    ).toBe(200);
    await expect(store.locator(`#category-${ids[3]}`)).toContainText(`${tag}-renamed`, {
      timeout: 20000,
    });
    expect(navigations).toEqual([]);
    await page.bringToFront();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: "../.run/category-cards-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "../.run/category-cards-desktop.png", fullPage: true });
  } finally {
    for (const id of ids.reverse())
      expect(
        (await page.request.delete(`/management/api/categories/${id}/`, { headers })).status(),
      ).toBe(204);
    await store.close();
  }
});
