import "server-only";
import { storeLocationsSchema } from "./store-locations";
export async function loadStoreLocations() {
  try {
    const base = (process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/branches/`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Unavailable");
    return storeLocationsSchema.parse(await response.json());
  } catch { return null; }
}
