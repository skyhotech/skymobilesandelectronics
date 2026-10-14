import { expect, test } from "@playwright/test";

test("protected pages reject missing and forged sessions; public routes stay accessible", async ({ request, context, baseURL }) => {
  for (const path of ["/management/admin", "/management/admin/products", "/management/admin/categories"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, baseURL).pathname).toBe("/management/admin/login");
  }
  await context.addCookies([{ name: "sessionid", value: "forged-session", url: baseURL! }]);
  const forged = await context.request.get("/management/admin", { maxRedirects: 0 });
  expect(forged.status()).toBe(307);
  expect((await request.get("/management/admin/login")).status()).toBe(200);
  expect((await request.get("/")).status()).toBe(200);
  const denied = await request.get("/management/api/products/");
  expect(denied.status()).toBe(403);
  expect(denied.headers()["content-type"]).toContain("application/json");
});
