import { expect, test } from "@playwright/test";
test.use({ trace: "off" });
test("frontend owner product CRUD", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local backend and owner credentials");
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const tag = `qa-${Date.now()}`;
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manage your catalog" })).toBeVisible();
  // A full server request must accept the real Django session as well.
  expect((await page.request.get("/management/admin", { maxRedirects: 0 })).status()).toBe(200);
  const sidebar = page.getByRole("complementary", { name: "Management sidebar" });
  const sidebarBox = await sidebar.boundingBox();
  const mainBox = await page.getByRole("main").boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(Math.abs(mainBox!.width / sidebarBox!.width - 3)).toBeLessThan(0.02);
  await page.screenshot({ path: "../.run/admin-sidebar-desktop.png", fullPage: true });

  try {
    for (const [section, singular] of [
      ["Brands", "brand"],
      ["Categories", "category"],
    ]) {
      await page.getByRole("link", { name: section, exact: true }).click();
      await page.getByRole("button", { name: `Add ${singular}`, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name", { exact: true }).fill(`${tag}-${singular}`);
      await dialog.getByLabel("Slug", { exact: true }).fill(`${tag}-${singular}`);
      if (singular === "brand") {
        await dialog
          .getByLabel("Upload image")
          .setInputFiles("public/images/homepage/categories-v2/smartphones.webp");
        await expect(dialog.getByRole("img", { name: "Brand logo preview" })).toHaveAttribute(
          "src",
          /\/media\/brands\/optimized\//,
        );
      }
      await dialog.getByRole("button", { name: `Save ${singular}`, exact: true }).click();
      await expect(dialog).toBeHidden();
    }
    await page.getByRole("link", { name: "Products", exact: true }).click();
    await page.getByRole("button", { name: "Add product", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(`${tag}-product`);
    await dialog.getByLabel("Slug", { exact: true }).fill(`${tag}-product`);
    await dialog.getByLabel("SKU", { exact: true }).fill(tag);
    await dialog
      .getByLabel("Upload image")
      .setInputFiles("public/images/homepage/categories-v2/smartphones.webp");
    await expect(dialog.getByRole("img", { name: "Product image preview" })).toHaveAttribute(
      "src",
      /\/media\/products\/optimized\//,
    );
    await dialog.getByLabel("Brand", { exact: true }).selectOption({ label: `${tag}-brand` });
    await dialog.getByLabel("Category", { exact: true }).selectOption({ label: `${tag}-category` });
    await dialog.getByLabel("Price", { exact: true }).fill("12999.00");
    await dialog.getByRole("button", { name: "Save product", exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: `${tag}-product` });
    await expect(row).toContainText("12,999");
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await dialog.getByLabel("Price", { exact: true }).fill("11999.00");
    await dialog.getByRole("button", { name: "Save product", exact: true }).click();
    await expect(row).toContainText("11,999");
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm delete", exact: true }).click();
    await expect(row).toBeHidden();
  } finally {
    const session = await (await page.request.get("/management/api/session/")).json();
    for (const resource of ["products", "brands", "categories"]) {
      const response = await page.request.get(`/management/api/${resource}/?search=${tag}`);
      if (!response.ok()) continue;
      for (const entry of (await response.json()).results) {
        expect(
          (
            await page.request.delete(`/management/api/${resource}/${entry.id}/`, {
              headers: { "X-CSRFToken": session.csrfToken },
            })
          ).ok(),
        ).toBe(true);
      }
    }
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
