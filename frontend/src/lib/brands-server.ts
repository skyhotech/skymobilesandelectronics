import "server-only";
import { homepageBrandsSchema, type HomepageBrand } from "./brands";

/** Brands managed in /management/admin/brands (active + "Show on homepage" + has logo). */
export async function loadHomepageBrands(): Promise<HomepageBrand[]> {
  try {
    const base = (
      process.env.API_INTERNAL_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8000/api/v1"
    ).replace(/\/$/, "");
    const response = await fetch(`${base}/brands/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Brands API returned ${response.status}`);
    return homepageBrandsSchema.parse(await response.json());
  } catch (error) {
    console.error(
      "Homepage brands unavailable:",
      error instanceof Error ? error.message : "Unexpected response",
    );
    return [];
  }
}
