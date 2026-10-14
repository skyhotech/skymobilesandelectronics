import "server-only";
import { z } from "zod";
import { resolveMediaUrl } from "./media";

export const homepageBrandSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  logo_url: z
    .string()
    .refine((value) => Boolean(resolveMediaUrl(value)), "Invalid media reference"),
  display_order: z.number().int().nonnegative(),
});
export type HomepageBrand = z.infer<typeof homepageBrandSchema>;

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
    return z.array(homepageBrandSchema).parse(await response.json());
  } catch (error) {
    console.error(
      "Homepage brands unavailable:",
      error instanceof Error ? error.message : "Unexpected response",
    );
    return [];
  }
}
