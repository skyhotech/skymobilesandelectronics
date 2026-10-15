import "server-only";
import { cache } from "react";
import { productPageSchema, productSchema, productFilterOptionsSchema, catalogParams, type CatalogFilters } from "./products";

export class CatalogUnavailable extends Error {}

async function read(path: string): Promise<Response> {
  const base = (process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
  try {
    return await fetch(`${base}/products/${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000), redirect: "error" });
  } catch {
    throw new CatalogUnavailable("Catalog connection failed");
  }
}
export async function loadProducts(filters: CatalogFilters) {
  const response = await read(`?${catalogParams(filters)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new CatalogUnavailable("Catalog request failed");
  try { return productPageSchema.parse(await response.json()); }
  catch { throw new CatalogUnavailable("Invalid catalog response"); }
}
export const loadProduct = cache(async (slug: string) => {
  if (!/^[a-zA-Z0-9_-]{1,240}$/.test(slug)) return null;
  const response = await read(`${encodeURIComponent(slug)}/`);
  if (response.status === 404) return null;
  if (!response.ok) throw new CatalogUnavailable("Product request failed");
  try { return productSchema.parse(await response.json()); }
  catch { throw new CatalogUnavailable("Invalid product response"); }
});

export async function loadProductFilterOptions() {
  const response = await read("filters/options/");
  if (!response.ok) throw new CatalogUnavailable("Filter options unavailable");
  try { return productFilterOptionsSchema.parse(await response.json()); }
  catch { throw new CatalogUnavailable("Invalid filter options"); }
}
