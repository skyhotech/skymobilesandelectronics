import { z } from "zod";

const reference = z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string() });
const money = z.string().regex(/^\d{1,10}\.\d{2}$/);
export const productSchema = z.object({
  id: z.number().int().positive(), name: z.string(), slug: z.string(),
  description: z.string(), price: money, compare_at_price: money.nullable(),
  currency: z.literal("INR"), image_url: z.string().nullable(),
  brand: reference, category: reference,
});
export const productFilterOptionsSchema = z.object({ brands: z.array(reference), categories: z.array(reference) });
export const productPageSchema = z.object({
  count: z.number().int().nonnegative(), next: z.string().nullable(),
  previous: z.string().nullable(), results: z.array(productSchema),
});
export type CatalogProduct = z.infer<typeof productSchema>;
export type CatalogFilters = { search?: string; category?: string; brand?: string; ordering?: string; page?: string; min_price?: string; max_price?: string };
export const catalogOrdering = ["name", "-name", "price", "-price"] as const;

export function catalogParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["search", "category", "brand"] as const) {
    const value = filters[key]?.trim();
    if (!value) continue;
    if (key === "search") params.set(key, value.slice(0, 120));
    else if (/^[a-zA-Z0-9_-]{1,140}$/.test(value)) params.set(key, value);
  }
  for (const key of ["min_price", "max_price"] as const) {
    const value = filters[key]?.trim();
    if (value && /^\d{1,10}(\.\d{1,2})?$/.test(value)) params.set(key, value);
  }
  if (catalogOrdering.includes(filters.ordering as typeof catalogOrdering[number]))
    params.set("ordering", filters.ordering!);
  if (/^[1-9]\d{0,5}$/.test(filters.page || "")) params.set("page", filters.page!);
  return params;
}
export function formatPrice(value: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
}
