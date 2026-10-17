import "server-only";
import { experienceSchema, fallback } from "./experience";

export async function loadExperience() {
  const base = (
    process.env.API_INTERNAL_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000/api/v1"
  ).replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/site/experience/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return fallback;
    return experienceSchema.parse(await response.json());
  } catch {
    return fallback;
  }
}
