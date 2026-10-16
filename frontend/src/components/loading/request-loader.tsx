"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { PageLoader } from "./page-loader";

export function RequestLoader() {
  const fetching = useIsFetching({ predicate: query =>
    query.getObserversCount() > 0 && query.meta?.globalLoader !== false &&
    (query.state.data === undefined || query.meta?.globalLoader === "always"),
  });
  const mutating = useIsMutating();
  return fetching + mutating > 0 ? <PageLoader /> : null;
}
