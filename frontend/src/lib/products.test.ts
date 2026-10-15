import { describe, expect, it } from "vitest";
import { catalogParams, productSchema, formatPrice } from "./products";

describe("public catalog contract", () => {
  it("validates decimal money and currency without accepting numeric API prices", () => {
    const product = { id: 1, name: "Phone", slug: "phone", description: "", price: "12000.00", compare_at_price: null, currency: "INR", image_url: null, brand: { id: 1, name: "Brand", slug: "brand" }, category: { id: 1, name: "Phones", slug: "phones" } };
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(productSchema.safeParse({ ...product, price: 12000 }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, currency: "USD" }).success).toBe(false);
  });
  it("limits search, discards unsupported ordering and invalid pages", () => {
    expect(catalogParams({ search: " x ", ordering: "password", page: "-1" }).toString()).toBe("search=x");
    expect(catalogParams({ search: "a".repeat(300) }).get("search")).toHaveLength(120);
    expect(catalogParams({ ordering: "-price", page: "2", brand: "sky" }).get("page")).toBe("2");
  });
  it("preserves valid long slugs and rejects malformed category or brand filters", () => {
    const brand = "a".repeat(140);
    expect(catalogParams({ brand }).get("brand")).toBe(brand);
    expect(catalogParams({ category: "foo/bar", brand: "a".repeat(141) }).toString()).toBe("");
  });
  it("preserves decimal price bounds and rejects unsafe or invalid price input", () => {
    expect(catalogParams({ min_price: "100.01", max_price: "200" }).toString()).toBe("min_price=100.01&max_price=200");
    expect(catalogParams({ min_price: "-1", max_price: "NaN" }).toString()).toBe("");
    expect(catalogParams({ min_price: "1.001", max_price: "1e9" }).toString()).toBe("");
  });
  it("formats INR for customers", () => { expect(formatPrice("12000.00")).toContain("12,000.00"); });
});
