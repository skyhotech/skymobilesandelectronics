"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { managementApi } from "@/lib/management-api";
import styles from "./admin-search.module.css";

const schema = z.object({ results: z.array(z.object({ kind: z.enum(["brand", "category", "product"]), id: z.number().int().positive(), name: z.string(), brand_id: z.number().int().positive().nullable() })) });
const pages = [
  { name: "Inventory", href: "/management/admin/inventory", terms: "inventory stock closing breakup report availability" },
  { name: "Themes", href: "/management/admin/themes", terms: "themes theme appearance homepage design style" },
  { name: "Dashboard", href: "/management/admin/dashboard", terms: "dashboard overview totals home" },
  { name: "Brands", href: "/management/admin/brands", terms: "brands brand manufacturers companies" },
  { name: "Categories", href: "/management/admin/categories", terms: "categories category folders" },
  { name: "Products by brand", href: "/management/admin/brands", terms: "products product catalog catalogue" },
];
export function AdminSearch() {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resultType, setResultType] = useState("all");
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = setTimeout(() => setQuery(value.trim()), 250); return () => clearTimeout(timer); }, [value]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const search = useQuery({
    queryKey: ["management", "global-search", query],
    queryFn: async () => schema.parse(await managementApi(`search/?q=${encodeURIComponent(query)}`)),
    enabled: open && query.length >= 2, staleTime: 10000, retry: false,
  });
  const needle = query.normalize("NFKC").toLowerCase();
  const navigation = query.length >= 2 ? pages.filter(page => page.terms.includes(needle)).map(page => ({ ...page, kind: "Page" })) : [];
  const records = (search.data?.results || []).map(result => ({
    name: result.name, kind: result.kind,
    href: result.kind === "category" ? `/management/admin/categories/${result.id}` : `/management/admin/brands?${new URLSearchParams({ brand: String(result.kind === "brand" ? result.id : result.brand_id), ...(result.kind === "product" ? { search: result.name } : {}) })}`,
  }));
  const results = [...navigation, ...records].filter(result => resultType === "all" || result.kind === resultType);
  const close = () => { setOpen(false); setValue(""); setQuery(""); };
  return <div ref={root} className={styles.search} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label className={styles.field}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input type="search" role="combobox" aria-label="Search administration" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined} placeholder="Search all admin…" maxLength={120} value={value}
        onFocus={() => setOpen(true)} onChange={event => { setValue(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={event => {
          if (event.key === "Escape") { setOpen(false); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(index => (index + (event.key === "ArrowDown" ? 1 : -1) + Math.max(results.length, 1)) % Math.max(results.length, 1)); }
          if (event.key === "Enter" && results[active] && value.trim() === query) { event.preventDefault(); router.push(results[active].href); close(); }
        }} />
    </label>
    {open && <div className={styles.results}>
      <label className={styles.typeFilter}>Search in<select aria-label="Search result type" value={resultType} onChange={event => { setResultType(event.target.value); setActive(0); }}><option value="all">All administration</option><option value="Page">Pages</option><option value="brand">Brands</option><option value="category">Categories</option><option value="product">Products</option></select></label>
      {value.trim().length < 2 ? <p>Search pages, brands, categories or products. Use any letter case.</p> : value.trim() !== query || search.isFetching ? <p role="status">Searching…</p> : null}
      {search.error && <p role="alert">Catalog search is unavailable. Try again shortly.</p>}
      <div id={id} role="listbox" aria-label="Admin search results">{value.trim() === query && results.map((result, index) => <Link role="option" id={`${id}-${index}`} aria-selected={active === index} className={styles.result} href={result.href} key={`${result.kind}-${result.href}`} onMouseEnter={() => setActive(index)} onClick={close}><strong>{result.name}</strong><small>{result.kind}</small></Link>)}</div>
      {query.length >= 2 && value.trim() === query && !search.isFetching && !search.error && !results.length && <p>No matching results. Try a name, SKU or another shopping term.</p>}
    </div>}
  </div>;
}
