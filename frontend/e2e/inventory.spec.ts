import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("inventory navigates, fetches and displays report states safely", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Management sections" });
  const initialFetch = page.waitForResponse(response => response.url().includes("/management/api/inventory/") && response.request().method() === "GET");
  await navigation.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(page).toHaveURL(/\/management\/admin\/inventory$/);
  await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toBeVisible();
  // Verify the genuine server request before substituting labeled rendering fixtures.
  const initialResponse = await initialFetch;
  if (!initialResponse.ok()) await expect(page.getByRole("main").getByRole("alert")).toContainText("Unable to load inventory");
  const fixture = { columns: ["Item", "Branch", "Quantity"], rows: Array.from({ length: 125 }, (_, index) => [`Phone ${index}`, "Test branch", String(index)]) };
  await page.route("**/management/api/inventory/", route => route.fulfill({ json: fixture }));
  await page.getByRole("button", { name: "Refresh inventory", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Quantity", exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(101);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(26);
  await page.getByRole("searchbox", { name: "Search inventory" }).fill("PHONE 119");
  await expect(page.getByRole("cell", { name: "Phone 119", exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(101);
  await page.unroute("**/management/api/inventory/");
  await page.route("**/management/api/inventory/", route => route.fulfill({ json: { columns: [], rows: [] } }));
  await page.getByRole("button", { name: "Refresh inventory", exact: true }).click();
  await expect(page.getByText("APX returned no inventory records for the configured report scope.")).toBeVisible();
});
