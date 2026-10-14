"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { categoryTreeSnapshotSchema as snapshotSchema, type HomepageCategory } from "./categories";
import { treeRows } from "./category-tree";

type Snapshot = z.infer<typeof snapshotSchema>;
const key = ["public", "categories", "tree"];

export function useLiveCategories(initial: HomepageCategory[]) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: key,
    initialData: { revision: -1, nodes: initial },
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }): Promise<Snapshot> => {
      const previous = cache.getQueryData<Snapshot>(key);
      const response = await fetch("/catalog/categories/tree/", {
        signal,
        cache: "no-store",
        credentials: "omit",
        headers:
          previous && previous.revision >= 0
            ? { "If-None-Match": `"categories-${previous.revision}"` }
            : {},
      });
      if (response.status === 304 && previous) return previous;
      if (!response.ok) throw new Error("Category updates are temporarily unavailable.");
      return snapshotSchema.parse(await response.json());
    },
  });
  return {
    categories: treeRows(query.data.nodes).map((row) => ({
      ...row.node,
      breadcrumb: row.path,
      depth: row.depth,
    })),
    error: query.error,
    synchronized: query.data.revision >= 0,
  };
}
