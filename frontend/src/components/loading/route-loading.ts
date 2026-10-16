"use client";
import { useSyncExternalStore } from "react";
const sources = new Set<symbol>();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function registerRouteLoading() {
  const id = Symbol(); sources.add(id); emit();
  return () => { sources.delete(id); emit(); };
}
export function useRouteLoading() {
  return useSyncExternalStore(subscribe, () => sources.size > 0, () => false);
}
