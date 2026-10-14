import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ trace: "off" });

test("banner media renders through the shared component and missing images fall back", async ({
  page,
}) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials and API");
  const tag = `qa-media-${Date.now()}`;
  const categories: number[] = [];
  let assetId: string | undefined;
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manage your catalog" })).toBeVisible();
  const session = await (await page.request.get("/management/api/session/")).json();
  const headers = { "X-CSRFToken": session.csrfToken };
  try {
    const upload = await page.request.post("/management/api/media/upload/", {
      headers,
      multipart: {
        kind: "banners",
        file: {
          name: "banner.webp",
          mimeType: "image/webp",
          buffer: await readFile("public/images/homepage/categories-v2/smartphones.webp"),
        },
      },
    });
    expect(upload.status()).toBe(201);
    const asset = await upload.json();
    assetId = asset.id;
    expect(asset.file_name).toMatch(/^banners\/optimized\//);
    for (const [suffix, image] of [
      ["banner", asset.image_url],
      ["missing", "/media/products/optimized/missing-image.webp"],
    ]) {
      const response = await page.request.post("/management/api/categories/", {
        headers,
        data: {
          name: `${tag}-${suffix}`,
          slug: `${tag}-${suffix}`,
          image_url: image,
          show_on_homepage: true,
        },
      });
      expect(response.status()).toBe(201);
      categories.push((await response.json()).id);
    }
    await page.goto("/");
    const banner = page
      .locator(".category-tile")
      .filter({ hasText: `${tag}-banner` })
      .getByRole("img");
    await expect(banner).toHaveAttribute("src", /\/media\/banners\/optimized\//);
    await banner.evaluate(async (image) => {
      (image as HTMLImageElement).loading = "eager";
      await (image as HTMLImageElement).decode();
    });
    const missing = page
      .locator(".category-tile")
      .filter({ hasText: `${tag}-missing` })
      .getByRole("img");
    await missing.scrollIntoViewIfNeeded();
    await expect(missing).toHaveAttribute("src", "/images/image-placeholder.svg");
    await expect
      .poll(() => missing.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  } finally {
    for (const id of categories)
      expect(
        (await page.request.delete(`/management/api/categories/${id}/`, { headers })).ok(),
      ).toBe(true);
    if (assetId)
      expect(
        (await page.request.delete(`/management/api/media/${assetId}/`, { headers })).ok(),
      ).toBe(true);
  }
});
