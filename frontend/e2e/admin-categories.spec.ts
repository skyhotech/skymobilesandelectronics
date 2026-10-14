import { expect, test } from "@playwright/test";

test.use({ trace: "off" });

test("admin category CRUD controls the actual homepage", async ({ page, context }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local API and owner credentials");
  test.setTimeout(90000);
  const tag = `qa-category-${Date.now()}`;
  let identifier: number | undefined;
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  const storefront = await context.newPage();
  try {
    await page.getByRole("button", { name: "Add category", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(tag);
    await dialog.getByLabel("Slug", { exact: true }).fill(tag);
    await dialog
      .getByLabel("Upload image")
      .setInputFiles("public/images/homepage/categories-v2/smartphones.webp");
    await expect(dialog.getByRole("img", { name: "Category image preview" })).toHaveAttribute(
      "src",
      /\/media\/categories\//,
    );
    await dialog.getByLabel("Badge", { exact: true }).fill("Admin managed");
    await dialog.getByLabel("Starting price (INR)", { exact: true }).fill("1234.50");
    await dialog
      .getByLabel("Card subtitle", { exact: true })
      .fill("Saved through Django REST Framework");
    await dialog.getByLabel("Display order", { exact: true }).fill("0");
    await dialog.getByLabel("Link to section", { exact: true }).selectOption("#gadgets");
    await dialog.getByLabel("Show on homepage", { exact: true }).check();
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/management/api/categories/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Save category", exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    identifier = (await response.json()).id;
    await expect(dialog).toBeHidden();
    await storefront.goto("/");
    const card = storefront.locator(".category-tile").filter({ hasText: tag });
    await expect(card).toBeVisible();
    await expect(storefront.locator(".category-tile").first()).toContainText(tag);
    await expect(card).toHaveAttribute("href", "#gadgets");
    await expect(card).toContainText("1,234.5");
    await expect(card).toContainText("Admin managed");
    await card.locator("img").evaluate(async (element) => {
      await (element as HTMLImageElement).decode();
    });
    const row = page.getByRole("article", { name: tag, exact: true });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await dialog.getByLabel("Badge", { exact: true }).fill("Updated badge");
    await dialog.getByRole("button", { name: "Save category", exact: true }).click();
    await expect(dialog).toBeHidden();
    await storefront.reload();
    await expect(card).toContainText("Updated badge");
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await dialog.getByLabel("Show on homepage", { exact: true }).uncheck();
    await dialog.getByRole("button", { name: "Save category", exact: true }).click();
    await expect(dialog).toBeHidden();
    await storefront.reload();
    await expect(card).toHaveCount(0);
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm delete", exact: true }).click();
    await expect(row).toHaveCount(0);
    identifier = undefined;
    await page.goto("/backend/django/admin/");
    await expect(page).toHaveURL(/\/management\/admin\/?$/);
    await expect(page.getByRole("link", { name: /advanced administration/i })).toHaveCount(0);
  } finally {
    if (identifier) {
      const session = await (await page.request.get("/management/api/session/")).json();
      const result = await page.request.delete(`/management/api/categories/${identifier}/`, {
        headers: { "X-CSRFToken": session.csrfToken },
      });
      expect(result.ok()).toBe(true);
    }
    await storefront.close();
  }
});
