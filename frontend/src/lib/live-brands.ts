"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { homepageBrandsSchema, type HomepageBrand } from "./brands";

type Snapshot = { brands: HomepageBrand[]; etag: string | null };
const key = ["public", "brands"];

export function useLiveBrands(initial: HomepageBrand[]) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: key,
    initialData: { brands: initial, etag: null } as Snapshot,
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
    queryFn: async ({ signal }): Promise<Snapshot> => {
      const previous = cache.getQueryData<Snapshot>(key);
      const response = await fetch("/catalog/brands/", {
        signal, cache: "no-store", credentials: "omit",
        headers: previous?.etag ? { "If-None-Match": previous.etag } : {},
      });
      if (response.status === 304 && previous) return previous;
      if (!response.ok) throw new Error("Brand updates are temporarily unavailable.");
      return { brands: homepageBrandsSchema.parse(await response.json()), etag: response.headers.get("ETag") };
    },
  });
  return { brands: query.data.brands, error: query.error };
}
