"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { VideoLoader } from "./video-loader";
import { useRouteLoading } from "./route-loading";

export function RequestLoader() {
  const fetching = useIsFetching({ predicate: query =>
    query.getObserversCount() > 0 && query.meta?.globalLoader !== false &&
    (query.state.data === undefined || query.meta?.globalLoader === "always"),
  });
  const mutating = useIsMutating();
  const routeLoading = useRouteLoading();
  return <VideoLoader active={fetching + mutating > 0 || routeLoading} />;
}
