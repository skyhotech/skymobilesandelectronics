"use client";

import { type DirectoryFilters, directoryFiltersActive } from "@/lib/directory-filters";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./filters.module.css";

export function DirectoryFilterOptions({ value, onChange, onClear }: {
  value: DirectoryFilters; onChange: (value: DirectoryFilters) => void; onClear: () => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const reposition = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setPosition({ top: Math.max(12, Math.min(rect.bottom + 8, innerHeight - 340)), left: Math.max(12, Math.min(rect.left, innerWidth - 292)) });
  }, []);
  useEffect(() => {
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [reposition]);
  return <div className={styles.disclosure}>
    <button ref={trigger} type="button" popoverTarget={id} onClick={reposition}>Filters{directoryFiltersActive(value) ? " •" : ""}</button>
    <div id={id} popover="auto" className={styles.popup} style={position}>
      <label>Homepage setting<select value={value.homepage} onChange={event => onChange({ ...value, homepage: event.target.value as DirectoryFilters["homepage"] })}>
        <option value="all">All settings</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>
      </select></label>
      <label>Image<select value={value.image} onChange={event => onChange({ ...value, image: event.target.value as DirectoryFilters["image"] })}>
        <option value="all">All images</option><option value="present">With image</option><option value="missing">Missing image</option>
      </select></label>
      <label>Sort directory<select value={value.ordering} onChange={event => onChange({ ...value, ordering: event.target.value as DirectoryFilters["ordering"] })}>
        <option value="saved">Saved order</option><option value="name">Name A–Z</option><option value="-name">Name Z–A</option>
      </select></label>
      <button type="button" onClick={onClear}>Clear all filters</button>
      <p>Clear filters and use saved order to drag cards.</p>
    </div>
  </div>;
}
