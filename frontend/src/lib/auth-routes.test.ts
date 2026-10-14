import { describe, expect, it } from "vitest";
import { safeManagementReturn } from "./auth-routes";

describe("management return paths", () => {
  it("preserves an internal management destination", () => {
    expect(safeManagementReturn("/management/admin/products?edit=1")).toBe("/management/admin/products?edit=1");
  });
  it.each([null, "https://evil.example", "//evil.example", "/management/admin/login", "/management/administrator", "/management/admin/../login", "/\\evil.example"]) ("rejects unsafe or looping destination %s", (path) => {
    expect(safeManagementReturn(path)).toBe("/management/admin");
  });
});
