import { expect, test } from "@playwright/test";

test.use({ trace: "off" });
test("create a parent and subcategory with file-manager uploads", async ({ page, context }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  test.setTimeout(90000);
  const tag = `qa-tree-${Date.now()}`;
  const ids: number[] = [];
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  try {
    for (const suffix of ["parent", "child"]) {
      await page.getByRole("button", { name: "Add category", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name", { exact: true }).fill(`${tag}-${suffix}`);
      await dialog.getByLabel("Slug", { exact: true }).fill(`${tag}-${suffix}`);
      await expect(dialog.getByLabel("Existing artwork")).toHaveCount(0);
      if (suffix === "child")
        await dialog.getByLabel("Parent category").selectOption(String(ids[0]));
      await dialog
        .getByLabel("Upload image")
        .setInputFiles("public/images/homepage/categories-v2/earbuds.webp");
      await expect(dialog.getByRole("img", { name: "Category image preview" })).toHaveAttribute(
        "src",
        /\/media\/categories\/optimized\//,
      );
      await dialog.getByLabel("Show on homepage", { exact: true }).check();
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith("/management/api/categories/") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Save category", exact: true }).click();
      const response = await saved;
      expect(response.status()).toBe(201);
      const data = await response.json();
      ids.push(data.id);
      expect(data.parent).toBe(suffix === "child" ? ids[0] : null);
      await expect(dialog).toBeHidden();
    }
    await page.getByRole("link", { name: `Open ${tag}-parent`, exact: true }).click();
    await expect(page.getByRole("article", { name: `${tag}-child`, exact: true })).toBeVisible();
    const store = await context.newPage();
    await store.goto("/");
    const child = store.locator(".category-tile").filter({ hasText: `${tag}-child` });
    await expect(child).toContainText(`In ${tag}-parent`);
    await child.locator("img").evaluate(async (image) => (image as HTMLImageElement).decode());
    await store.close();
  } finally {
    const session = await (await page.request.get("/management/api/session/")).json();
    for (const id of ids.reverse()) {
      expect(
        (
          await page.request.delete(`/management/api/categories/${id}/`, {
            headers: { "X-CSRFToken": session.csrfToken },
          })
        ).status(),
      ).toBe(204);
    }
  }
});
