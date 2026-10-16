type Location = { name: string; address: string; google_maps_url: string };

/** Google Maps universal URLs need no API key or geolocation request here. */
export function branchDirections(branch: Location): string | null {
  let destination = "";
  let placeId = "";
  try {
    const map = new URL(branch.google_maps_url);
    if (map.protocol === "https:" && ["www.google.com", "google.com", "maps.google.com"].includes(map.hostname)) {
      destination = map.searchParams.get("destination") || map.searchParams.get("query") || map.searchParams.get("q") || "";
      placeId = map.searchParams.get("destination_place_id") || map.searchParams.get("query_place_id") || "";
    }
  } catch { /* A saved address can still supply directions when no map link exists. */ }
  if (!destination && branch.address.trim()) destination = `SKY Mobile & Electronics ${branch.name}, ${branch.address.trim()}`;
  if (!destination || /^https?:/i.test(destination)) return null;
  const params = new URLSearchParams({ api: "1", destination, dir_action: "navigate" });
  if (placeId) params.set("destination_place_id", placeId);
  const url = `https://www.google.com/maps/dir/?${params}`;
  return url.length <= 2048 ? url : null;
}
