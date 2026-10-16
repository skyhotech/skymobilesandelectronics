import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("customers tab validates lookup and displays safe result states", async ({ page }) => {
  test.skip(!process.env.SKY_ADMIN_TESTS, "Requires local owner credentials");
  await page.goto("/management/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(process.env.SKY_ADMIN_USERNAME!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.SKY_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading page", exact: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Management sections" }).getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
  const mobile = page.getByLabel("Customer mobile number");
  await mobile.fill("123");
  await page.getByRole("button", { name: "Find customer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Enter a valid mobile");
  await page.route("**/management/api/customers/lookup/", async route => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ mobile: "9999999999" });
    await route.fulfill({ json: { columns: ["Name", "Mobile"], rows: [["Test customer", "9999999999"]] } });
  });
  await mobile.fill("9999999999");
  await page.getByRole("button", { name: "Find customer", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Test customer", exact: true })).toBeVisible();
  expect(page.url()).not.toContain("9999999999");
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(mobile).toHaveValue("");
  await expect(page.getByRole("region", { name: "Customer results" })).toHaveCount(0);
  await page.unroute("**/management/api/customers/lookup/");
  await page.route("**/management/api/customers/lookup/", route => route.fulfill({ json: { columns: [], rows: [] } }));
  await mobile.fill("9999999999");
  await page.getByRole("button", { name: "Find customer", exact: true }).click();
  await expect(page.getByText("No customers found for this mobile number.")).toBeVisible();
});
