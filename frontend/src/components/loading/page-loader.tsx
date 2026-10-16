"use client";
import { useEffect } from "react";
import { registerRouteLoading } from "./route-loading";

// The root overlay outlives this temporary Next.js loading boundary.
export function PageLoader() {
  useEffect(registerRouteLoading, []);
  return null;
}
