export type DirectoryFilters = {
  homepage: "all" | "enabled" | "disabled";
  image: "all" | "present" | "missing";
  ordering: "saved" | "name" | "-name";
};
export const defaultDirectoryFilters: DirectoryFilters = { homepage: "all", image: "all", ordering: "saved" };
export function directoryFiltersActive(filters: DirectoryFilters) {
  return filters.homepage !== "all" || filters.image !== "all" || filters.ordering !== "saved";
}
export function filterDirectory<T extends { id: number; name: string; show_on_homepage?: boolean }>(
  entries: T[], filters: DirectoryFilters, image: (entry: T) => string | undefined,
): T[] {
  return entries.filter(entry =>
    (filters.homepage === "all" || Boolean(entry.show_on_homepage) === (filters.homepage === "enabled")) &&
    (filters.image === "all" || Boolean(image(entry)?.trim()) === (filters.image === "present")),
  ).sort((a, b) => filters.ordering === "saved" ? 0 :
    (filters.ordering === "name" ? 1 : -1) * (a.name.localeCompare(b.name) || a.id - b.id));
}
