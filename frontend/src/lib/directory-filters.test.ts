import { expect, it } from "vitest";
import { defaultDirectoryFilters, directoryFiltersActive, filterDirectory } from "./directory-filters";

it("combines directory settings and sorts a copy without changing saved drag order", () => {
  const entries = [
    { id: 1, name: "Zebra", show_on_homepage: true, image: "a.webp" },
    { id: 2, name: "Apple", show_on_homepage: true, image: "b.webp" },
    { id: 3, name: "Other", show_on_homepage: false, image: "" },
  ];
  const filters = { homepage: "enabled", image: "present", ordering: "name" } as const;
  expect(filterDirectory(entries, filters, row => row.image).map(row => row.id)).toEqual([2, 1]);
  expect(entries.map(row => row.id)).toEqual([1, 2, 3]);
  expect(directoryFiltersActive(filters)).toBe(true);
  expect(directoryFiltersActive(defaultDirectoryFilters)).toBe(false);
  expect(filterDirectory(entries, { ...defaultDirectoryFilters, image: "missing" }, row => row.image).map(row => row.id)).toEqual([3]);
  expect(filterDirectory(entries, defaultDirectoryFilters, row => row.image)).toEqual(entries);
});
