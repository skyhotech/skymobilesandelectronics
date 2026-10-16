import { describe, expect, it } from "vitest";
import { branchDirections } from "./branch-directions";
const branch = { name: "ARNI-1", address: "21 Big Bazaar Street, Arni", google_maps_url: "" };
describe("Google directions without API keys", () => {
  it("encodes an address and lets Google choose the starting point", () => {
    const url = new URL(branchDirections(branch)!);
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toContain(branch.address);
    expect(url.searchParams.has("origin")).toBe(false);
    expect(url.searchParams.has("key")).toBe(false);
  });
  it("uses fresh verified coordinates and place ID for directions", () => {
    const url = new URL(branchDirections({ ...branch, latitude: "12.6723", longitude: "79.2873", google_place_id: "place-test", location_verified: true })!);
    expect(url.searchParams.get("destination")).toBe("12.6723,79.2873");
    expect(url.searchParams.get("destination_place_id")).toBe("place-test");
  });
  it("preserves a saved destination and place identifier", () => {
    const url = new URL(branchDirections({ ...branch, google_maps_url: "https://www.google.com/maps/search/?api=1&query=SKY+Arni&query_place_id=place-test" })!);
    expect(url.searchParams.get("destination")).toBe("SKY Arni");
    expect(url.searchParams.get("destination_place_id")).toBe("place-test");
  });
  it("uses the address for short links and never guesses from a city", () => {
    expect(branchDirections({ ...branch, google_maps_url: "https://maps.app.goo.gl/example" })).toContain("/maps/dir/");
    expect(branchDirections({ ...branch, address: "", google_maps_url: "https://maps.app.goo.gl/example" })).toBeNull();
  });
  it("does not use destinations from untrusted domains or overlong addresses", () => {
    expect(branchDirections({ ...branch, address: "", google_maps_url: "https://evil.example/?query=Somewhere" })).toBeNull();
    expect(branchDirections({ ...branch, address: "a".repeat(3000) })).toBeNull();
  });
});
