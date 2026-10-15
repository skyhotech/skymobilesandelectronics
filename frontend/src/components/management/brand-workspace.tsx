"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { allReferences, managementApi, type Reference } from "@/lib/management-api";
import { Icon } from "./category-cards";
import { BrandCards } from "./brand-cards";
import styles from "./category-manager.module.css";

export function BrandWorkspace({ onAdd, onEdit, onDelete }: {
  onAdd: () => void; onEdit: (brand: Reference) => void; onDelete: (brand: Reference) => void;
}) {
  const cache = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const brands = useQuery({ queryKey: ["management", "brands", "cards"], queryFn: () => allReferences("brands"), retry: false });
  const move = useMutation({
    mutationFn: ({ id, before }: { id: number; before: number | null }) => managementApi("brands/move/", "POST", { id, before }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["management", "brands"] });
      await cache.invalidateQueries({ queryKey: ["public", "brands"] });
    },
  });
  const nodes = brands.data || [];
  const visible = nodes.filter(brand => (filter === "all" || brand.is_active === (filter === "active")) && `${brand.name} ${brand.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className={styles.workspace} aria-label="Brand manager">
    <header className={styles.pageHeader}>
      <nav className={styles.breadcrumbs} aria-label="Brand breadcrumbs"><span>Main brands</span></nav>
      <div className={styles.titleRow}><div className={styles.titleBlock}><div><h1>Brands</h1><p>Organise your storefront brands. Drag cards to reorder or open a card to edit.</p></div></div><div className={styles.headerActions}><button className={styles.primaryButton} onClick={onAdd}>{Icon.plus} Add brand</button></div></div>
      <dl className={styles.stats}>
        <div><dt>Total brands</dt><dd>{nodes.length}</dd></div><div><dt>Active</dt><dd>{nodes.filter(b => b.is_active).length}</dd></div>
        <div><dt>On homepage</dt><dd>{nodes.filter(b => b.is_active && b.show_on_homepage).length}</dd></div><div><dt>Visible</dt><dd>{visible.length}</dd></div>
      </dl>
    </header>
    <div className={styles.body}>
      <aside className={styles.treePanel}><nav aria-label="Brand directory"><div className={styles.treeHeading}><span>Brand directory</span></div>
        <div className={styles.treeRow} data-selected="true"><button className={styles.treeLink} onClick={() => { setQuery(""); setFilter("all"); }}><span className={styles.treeName}>All brands</span><span className={styles.treeCount}>{nodes.length}</span></button></div>
        <div className={styles.treeScroll}>{nodes.map(brand => <div className={styles.treeRow} key={brand.id}><button className={styles.treeLink} onClick={() => onEdit(brand)}><span className={styles.treeName}>{brand.name}</span></button></div>)}</div>
      </nav></aside>
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>{Icon.search}<input type="search" aria-label="Search brands" placeholder="Search all brands by name or slug…" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className={styles.segmented} role="group" aria-label="Status filter">{(["all", "active", "inactive"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
          <div className={styles.segmented} role="group" aria-label="Layout"><button aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>{Icon.grid}</button><button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>{Icon.list}</button></div>
        </div>
        {brands.isPending ? <p role="status">Loading brands…</p> : brands.error ? <div className={styles.emptyState}><p role="alert">{brands.error.message}</p><button className={styles.primaryButton} onClick={() => brands.refetch()}>Retry</button></div> : <>
          {!visible.length && <div className={styles.emptyState}><h2>No matching brands</h2><p>Try another search or add a brand.</p></div>}
          <BrandCards brands={visible} view={view} disabled={!!query.trim() || filter !== "all"} saving={move.isPending} onMove={(id, before) => move.mutate({ id, before })} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
        </>}
        {move.isPending && <p role="status">Saving brand order…</p>}
        {move.error && <p role="alert">{move.error.message}</p>}
        {move.isSuccess && <p role="status">Brand order saved.</p>}
      </div>
    </div>
  </section>;
}

