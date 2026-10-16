import { describe, expect, it } from "vitest";
import { safeManagementReturn, safeHRReturn } from "./auth-routes";

describe("management return paths", () => {
  it("preserves an internal management destination", () => {
    expect(safeManagementReturn("/management/admin/products?edit=1")).toBe(
      "/management/admin/products?edit=1",
    );
  });
  it.each([
    null,
    "https://evil.example",
    "//evil.example",
    "/management/admin/login",
    "/management/administrator",
    "/management/admin/../login",
    "/\\evil.example",
  ])("rejects unsafe or looping destination %s", (path) => {
    expect(safeManagementReturn(path)).toBe("/management/admin");
  });
});

describe("HR return paths", () => {
  it("stays in HR and rejects external, login and management destinations", () => {
    expect(safeHRReturn("/hr?view=home")).toBe("/hr?view=home");
    for (const path of [null, "https://evil.example", "//evil.example", "/hr/login", "/management/admin", "/hr/../management/admin"])
      expect(safeHRReturn(path)).toBe("/hr");
  });
});
