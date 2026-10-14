import "server-only";
import { categoryTreeSnapshotSchema, type HomepageCategory } from "./categories";

export async function loadHomepageCategories(): Promise<{
  categories: HomepageCategory[];
  unavailable: boolean;
}> {
  try {
    const base = (
      process.env.API_INTERNAL_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8000/api/v1"
    ).replace(/\/$/, "");
    const response = await fetch(`${base}/categories/tree/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Categories API returned ${response.status}`);
    const data = categoryTreeSnapshotSchema.parse(await response.json());
    return { categories: data.nodes, unavailable: false };
  } catch (error) {
    console.error(
      "Homepage categories unavailable:",
      error instanceof Error ? error.message : "Unexpected response",
    );
    return { categories: [], unavailable: true };
  }
}
