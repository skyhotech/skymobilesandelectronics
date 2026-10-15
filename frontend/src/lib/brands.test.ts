import { expect, it } from "vitest";
import { homepageBrandsSchema } from "./brands";

it("accepts an empty feed so every brand can be unpublished", () => {
  expect(homepageBrandsSchema.parse([])).toEqual([]);
});

it("validates public brand fields and media references before replacing cards", () => {
  const brand = { id: 1, name: "SKY", slug: "sky", logo_url: "/media/brands/sky.webp", display_order: 0 };
  expect(homepageBrandsSchema.parse([brand])).toEqual([brand]);
  expect(homepageBrandsSchema.safeParse([{ ...brand, logo_url: "javascript:alert(1)" }]).success).toBe(false);
  expect(homepageBrandsSchema.safeParse([{ ...brand, display_order: -1 }]).success).toBe(false);
  expect(homepageBrandsSchema.safeParse({ results: [brand] }).success).toBe(false);
});
