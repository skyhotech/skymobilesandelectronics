"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { storeLocationsSchema, type StoreLocation } from "@/lib/store-locations";
import styles from "./store-locator.module.css";
export function StoreLocator({ initialLocations }: { initialLocations: StoreLocation[] | null }) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const locations = useQuery({ queryKey: ["public", "store-locations"], initialData: initialLocations ?? undefined, staleTime: 60000, refetchInterval: 60000, meta: { globalLoader: false }, queryFn: async () => { const response = await fetch("/catalog/branches/", { cache: "no-store" }); if (!response.ok) throw new Error("Unable to load store locations"); return storeLocationsSchema.parse(await response.json()); } });
  const stores = locations.data || [];
  const cities = [...new Set(stores.map(item => item.city).filter(Boolean))].sort();
  const filtered = stores.filter(item => (!city || item.city === city) && `${item.name} ${item.city} ${item.address}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section id="store-locator" className={styles.locator} aria-labelledby="store-locator-title"><header><p>VISIT SKY</p><h2 id="store-locator-title">Find your nearest store</h2><p>Explore our branches and get directions with Google Maps.</p></header>
    <iframe className={styles.map} src="https://www.google.com/maps/d/embed?mid=1CKN57mmNV4leZOg8TogGsFTtWhoMf04&ehbc=2E312F" title="SKY store locations on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    <div className={styles.filters}><label>Search stores<input type="search" placeholder="Branch, city or address" maxLength={150} value={search} onChange={event => setSearch(event.target.value)} /></label><label>Filter by city<select value={city} onChange={event => setCity(event.target.value)}><option value="">All cities</option>{cities.map(name => <option key={name}>{name}</option>)}</select></label></div>
    {locations.isPending && <p role="status">Loading store locations...</p>}{locations.error && <p role="alert">Unable to refresh store locations. <button onClick={() => locations.refetch()}>Retry</button></p>}
    {locations.data && <><p>{filtered.length} stores found</p><div className={styles.cards}>{filtered.map(store => <article key={store.id}><h3>{store.name}</h3><p>{store.address || store.city}</p>{store.phone && <a href={`tel:${store.phone.replace(/[^+0-9]/g, "")}`}>{store.phone}</a>}{store.google_maps_url && <a href={store.google_maps_url} target="_blank" rel="noopener noreferrer">Get directions</a>}</article>)}</div>{!filtered.length && <p>No stores match your search.</p>}</>}
  </section>;
}
