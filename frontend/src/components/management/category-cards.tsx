"use client";

import { DirectoryFilterOptions } from "./directory-filters";
import { defaultDirectoryFilters, directoryFiltersActive, filterDirectory } from "@/lib/directory-filters";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryTreeSnapshotSchema, type HomepageCategory } from "@/lib/categories";
import { managementApi, type Reference } from "@/lib/management-api";
import { MediaImage } from "@/components/media/media-image";
import styles from "./category-manager.module.css";

type Snapshot = ReturnType<typeof categoryTreeSnapshotSchema.parse>;
type Filter = "all" | "active" | "inactive";
type View = "grid" | "list";
const treeKey = ["management", "categories", "tree"];

export const categoryUrl = (id: number | null) =>
  `/management/admin/categories${id === null ? "" : `/${id}`}`;

const sortSiblings = (a: HomepageCategory, b: HomepageCategory) =>
  a.display_order - b.display_order || a.name.localeCompare(b.name) || a.id - b.id;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Plain left clicks are handled client-side; modified clicks keep native link behaviour. */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Mirrors the backend `categories/move/` ordering so the UI can update instantly. */
function applyMove(
  snapshot: Snapshot,
  id: number,
  parent: number | null,
  before: number | null,
): Snapshot {
  const siblings = snapshot.nodes
    .filter((node) => node.parent === parent && node.id !== id)
    .sort(sortSiblings);
  const moving = snapshot.nodes.find((node) => node.id === id);
  if (!moving) return snapshot;
  const index = before === null ? -1 : siblings.findIndex((node) => node.id === before);
  siblings.splice(index < 0 ? siblings.length : index, 0, moving);
  const order = new Map(siblings.map((node, position) => [node.id, position]));
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) =>
      order.has(node.id) ? { ...node, parent, display_order: order.get(node.id)! } : node,
    ),
  };
}

export const Icon = {
  plus: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3.3 3.3" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 5 5 5-5 5" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M12.5 5 7.5 10l5 5" />
    </svg>
  ),
  up: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 12.5 5-5 5 5" />
    </svg>
  ),
  down: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.5 6.5a2 2 0 0 1 2-2h3l1.8 2h6.2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 9 10 3.5 16.5 9M5.5 7.5V16h9V7.5" />
    </svg>
  ),
};

export function CategoryCards({
  parentId,
  onNavigate,
  onAdd,
  onEdit,
  onDelete,
}: {
  parentId: number | null;
  onNavigate: (id: number | null) => void;
  onAdd: () => void;
  onEdit: (entry: Reference) => void;
  onDelete: (entry: Reference) => void;
}) {
  const cache = useQueryClient();
  const [extraFilters, setExtraFilters] = useState(defaultDirectoryFilters);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [toggled, setToggled] = useState<Map<number, boolean>>(() => new Map());
  const [preview, setPreview] = useState<{ id: number; order: number[] } | null>(null);
  const [saving, setSaving] = useState(0);
  const [moveError, setMoveError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const drag = useRef<{ id: number; pointerId: number; overId: number | null; x: number; y: number; moved: boolean } | null>(null);
  const [floating, setFloating] = useState<{ node: HomepageCategory; x: number; y: number; width: number } | null>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const positions = useRef(new Map<number, DOMRect>());
  const [over, setOver] = useState<number | null>(null);
  const cancelDrag = () => {
    drag.current = null;
    setPreview(null);
    setFloating(null);
    setOver(null);
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancelDrag(); };
    const blur = () => cancelDrag();
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", escape); window.removeEventListener("blur", blur); };
  }, []);
  useLayoutEffect(() => {
    const next = new Map<number, DOMRect>();
    workspaceRef.current?.querySelectorAll<HTMLElement>("article[data-card-id]").forEach(element => {
      const id = Number(element.dataset.cardId);
      element.getAnimations().forEach(animation => animation.cancel());
      const rect = element.getBoundingClientRect();
      next.set(id, rect);
      const previous = positions.current.get(id);
      if (previous && preview && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const x = previous.left - rect.left, y = previous.top - rect.top;
        if (Math.abs(x) + Math.abs(y) > 2) element.animate([
          { translate: `${x}px ${y}px` }, { translate: "0px 0px" },
        ], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    });
    positions.current = next;
  });
  const snapshot = useQuery({
    queryKey: treeKey,
    queryFn: async () => categoryTreeSnapshotSchema.parse(await managementApi("categories/tree/")),
    staleTime: 0,
  });

  /** Update the UI immediately, then persist in the background (requests run one at a time). */
  const commitMove = (id: number, before: number | null) => {
    const current = cache.getQueryData<Snapshot>(treeKey);
    if (!current) return;
    void cache.cancelQueries({ queryKey: treeKey });
    cache.setQueryData<Snapshot>(treeKey, applyMove(current, id, parentId, before));
    setMoveError(null);
    pending.current += 1;
    setSaving(pending.current);
    queue.current = queue.current
      .then(async () => {
        const revision = cache.getQueryData<Snapshot>(treeKey)?.revision ?? current.revision;
        const result = await managementApi<{ revision: number }>("categories/move/", "POST", {
          id,
          parent: parentId,
          before,
          revision,
        });
        cache.setQueryData<Snapshot>(
          treeKey,
          (old) => old && { ...old, revision: result.revision },
        );
      })
      .catch((error: unknown) => {
        setMoveError(error instanceof Error ? error.message : "Could not save the new order.");
        return cache.invalidateQueries({ queryKey: treeKey });
      })
      .finally(() => {
        pending.current -= 1;
        setSaving(pending.current);
        if (pending.current === 0) {
          void cache.invalidateQueries({ queryKey: ["management", "categories"] });
          void cache.invalidateQueries({ queryKey: ["management", "references"] });
        }
      });
  };

  const data = snapshot.data;
  const { nodes, byId, children } = useMemo(() => {
    const list = data?.nodes ?? [];
    const map = new Map(list.map((node) => [node.id, node]));
    const tree = new Map<number | null, HomepageCategory[]>();
    for (const node of list) {
      const bucket = tree.get(node.parent) ?? [];
      bucket.push(node);
      tree.set(node.parent, bucket);
    }
    for (const bucket of tree.values()) bucket.sort(sortSiblings);
    return { nodes: list, byId: map, children: tree };
  }, [data]);

  const lineage = (id: number | null) => {
    const chain: HomepageCategory[] = [];
    const seen = new Set<number>();
    let node = id === null ? undefined : byId.get(id);
    while (node && !seen.has(node.id)) {
      chain.unshift(node);
      seen.add(node.id);
      node = node.parent === null ? undefined : byId.get(node.parent);
    }
    return chain;
  };
  const ancestors = lineage(parentId);
  const currentCategory = ancestors.at(-1);
  const ancestorIds = new Set(ancestors.map((node) => node.id));
  const isOpen = (id: number) => toggled.get(id) ?? ancestorIds.has(id);
  const childCount = (id: number | null) => children.get(id)?.length ?? 0;

  const matchesFilter = (node: HomepageCategory) =>
    filter === "all" || (filter === "active" ? node.is_active : !node.is_active);
  const sorted = filterDirectory((children.get(parentId) ?? []).filter(matchesFilter), extraFilters, node => node.image_url);
  // While dragging, show the live preview order so cards swap instantly under the pointer.
  const siblings = preview
    ? preview.order.map((id) => byId.get(id)).filter((node): node is HomepageCategory => !!node)
    : sorted;
  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;
  const canReorder = !searching && filter === "all" && !directoryFiltersActive(extraFilters);
  const visible = searching
    ? filterDirectory(nodes
        .filter(
          (node) =>
            matchesFilter(node) && `${node.name} ${node.slug}`.toLowerCase().includes(needle),
        )
        .sort((a, b) => a.name.localeCompare(b.name)), extraFilters, node => node.image_url)
    : sorted;

  const stats = {
    total: nodes.length,
    active: nodes.filter((node) => node.is_active).length,
    homepage: nodes.filter((node) => node.is_active && node.show_on_homepage).length,
    here: children.get(parentId)?.length ?? 0,
  };

  const navigate = (id: number | null) => {
    setQuery("");
    setPreview(null);
    onNavigate(id);
  };
  const openHandler = (id: number | null) => (event: MouseEvent) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    navigate(id);
  };
  const target = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-card-id]");
  /** Move the dragged card to the hovered card's slot in the preview order. */
  const updatePreview = (activeId: number, overId: number) => {
    if (drag.current?.overId === overId) return;
    if (drag.current) drag.current.overId = overId;
    const base = preview?.order ?? sorted.map((node) => node.id);
    const order = base.filter((id) => id !== activeId);
    const overIndex = order.indexOf(overId);
    const currentIndex = base.indexOf(activeId);
    if (overId === 0 || overIndex < 0) order.push(activeId);
    else order.splice(currentIndex <= overIndex ? overIndex + 1 : overIndex, 0, activeId);
    if (preview && order.every((id, i) => id === preview.order[i])) return;
    setPreview({ id: activeId, order });
  };

  const renderBranch = (parent: number | null, depth: number): ReactNode => {
    const branch = children.get(parent);
    if (!branch?.length) return null;
    return (
      <ul className={styles.treeList}>
        {branch.map((node) => {
          const count = childCount(node.id);
          const open = count > 0 && isOpen(node.id);
          return (
            <li key={node.id}>
              <div
                className={styles.treeRow}
                data-selected={node.id === parentId}
                data-inactive={!node.is_active}
                style={{ paddingLeft: 8 + depth * 14 }}
              >
                {count > 0 ? (
                  <button
                    type="button"
                    className={styles.treeToggle}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
                    data-open={open}
                    onClick={() => setToggled((previous) => new Map(previous).set(node.id, !open))}
                  >
                    {Icon.chevron}
                  </button>
                ) : (
                  <span className={styles.treeSpacer} aria-hidden="true" />
                )}
                <a
                  href={categoryUrl(node.id)}
                  className={styles.treeLink}
                  aria-current={node.id === parentId ? "page" : undefined}
                  onClick={openHandler(node.id)}
                >
                  <span className={styles.treeName}>{node.name}</span>
                  {count > 0 && <span className={styles.treeCount}>{count}</span>}
                </a>
              </div>
              {open && renderBranch(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  if (snapshot.isPending)
    return (
      <section className={styles.workspace} aria-busy="true">
        <p role="status" className={styles.srOnly}>
          Loading categories…
        </p>
        <div className={styles.skeletonHeader} />
        <div className={styles.grid}>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      </section>
    );
  if (snapshot.error)
    return (
      <section className={styles.workspace}>
        <div className={styles.emptyState} role="alert">
          <h2>Couldn’t load categories</h2>
          <p>{snapshot.error.message}</p>
          <button className={styles.primaryButton} onClick={() => snapshot.refetch()}>
            Retry
          </button>
        </div>
      </section>
    );
  if (parentId !== null && !byId.has(parentId))
    return (
      <section className={styles.workspace}>
        <div className={styles.emptyState} role="alert">
          <h2>Category not found</h2>
          <p>It may have been deleted or moved.</p>
          <a className={styles.primaryButton} href={categoryUrl(null)} onClick={openHandler(null)}>
            Back to categories
          </a>
        </div>
      </section>
    );

  const parentOfCurrent = currentCategory ? currentCategory.parent : null;

  return (
    <section ref={workspaceRef} className={styles.workspace} aria-label="Category manager">
      {floating && createPortal(<div
        ref={floatingRef}
        className={styles.floatingCard}
        data-testid="category-drag-preview"
        aria-hidden="true"
        style={{ width: floating.width, transform: `perspective(900px) translate3d(${floating.x}px, ${floating.y}px, 0)` }}
      >
        <div className={styles.floatingArtwork}><MediaImage src={floating.node.image_url} alt="" width={240} height={150} /></div>
        <strong>{floating.node.name}</strong><span>Drop on a category to reorder · Esc to cancel</span>
      </div>, document.body)}
      <header className={styles.pageHeader}>
        <nav aria-label="Category breadcrumbs" className={styles.breadcrumbs}>
          <a
            href={categoryUrl(null)}
            onClick={openHandler(null)}
            aria-current={parentId === null ? "page" : undefined}
          >
            Main categories
          </a>
          {ancestors.map((node, index) => (
            <span key={node.id} className={styles.crumb}>
              <span className={styles.crumbSeparator} aria-hidden="true">
                {Icon.chevron}
              </span>
              <a
                href={categoryUrl(node.id)}
                onClick={openHandler(node.id)}
                aria-current={index === ancestors.length - 1 ? "page" : undefined}
              >
                {node.name}
              </a>
            </span>
          ))}
        </nav>
        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            {currentCategory && (
              <a
                href={categoryUrl(parentOfCurrent)}
                onClick={openHandler(parentOfCurrent)}
                className={styles.backButton}
                aria-label="Back to parent category"
              >
                {Icon.back}
              </a>
            )}
            <div>
              <h1>{currentCategory?.name ?? "Categories"}</h1>
              <p>
                {currentCategory
                  ? `${stats.here} ${stats.here === 1 ? "subcategory" : "subcategories"} · drag cards to reorder`
                  : "Organise your storefront catalogue. Click a category to open its subcategories."}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {currentCategory && (
              <button className={styles.ghostButton} onClick={() => onEdit(currentCategory)}>
                Edit details
              </button>
            )}
            <button className={styles.primaryButton} onClick={onAdd}>
              {Icon.plus}
              Add category
            </button>
          </div>
        </div>
        <dl className={styles.stats}>
          <div>
            <dt>Total categories</dt>
            <dd>{stats.total}</dd>
          </div>
          <div>
            <dt>Active</dt>
            <dd>
              {stats.active}
              <small> / {stats.total}</small>
            </dd>
          </div>
          <div>
            <dt>On homepage</dt>
            <dd>{stats.homepage}</dd>
          </div>
          <div>
            <dt>{currentCategory ? "In this category" : "Top level"}</dt>
            <dd>{stats.here}</dd>
          </div>
        </dl>
      </header>

      <div className={styles.body}>
        <aside className={styles.treePanel}>
          <nav aria-label="Category tree">
            <div className={styles.treeHeading}>
              <span>Category tree</span>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => setToggled(new Map(nodes.map((node) => [node.id, false])))}
              >
                Collapse all
              </button>
            </div>
            <div
              className={styles.treeRow}
              data-selected={parentId === null}
              style={{ paddingLeft: 8 }}
            >
              <span className={styles.treeRootIcon} aria-hidden="true">
                {Icon.home}
              </span>
              <a
                href={categoryUrl(null)}
                className={styles.treeLink}
                aria-current={parentId === null ? "page" : undefined}
                onClick={openHandler(null)}
              >
                <span className={styles.treeName}>All categories</span>
                <span className={styles.treeCount}>{childCount(null)}</span>
              </a>
            </div>
            <div className={styles.treeScroll}>{renderBranch(null, 0)}</div>
          </nav>
        </aside>

        <div className={styles.content}>
          {currentCategory && (
            <div className={styles.detailStrip}>
              <div className={styles.detailMedia}>
                <MediaImage
                  src={currentCategory.image_url}
                  alt={currentCategory.name}
                  width={96}
                  height={72}
                />
              </div>
              <div className={styles.detailInfo}>
                <strong>{currentCategory.name}</strong>
                <span>/{currentCategory.slug}</span>
              </div>
              <div className={styles.detailPills}>
                <span className={styles.pill} data-tone={currentCategory.is_active ? "ok" : "off"}>
                  {currentCategory.is_active ? "Active" : "Inactive"}
                </span>
                {currentCategory.show_on_homepage && (
                  <span className={styles.pill} data-tone="info">
                    On homepage
                  </span>
                )}
                {currentCategory.badge && (
                  <span className={styles.pill} data-tone="accent">
                    {currentCategory.badge}
                  </span>
                )}
                {currentCategory.starting_price && (
                  <span className={styles.pill}>
                    From {inr.format(Number(currentCategory.starting_price))}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              {Icon.search}
              <input
                type="search"
                aria-label="Search categories"
                placeholder="Search all categories by name or slug…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className={styles.segmented} role="group" aria-label="Status filter">
              {(["all", "active", "inactive"] as Filter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            <DirectoryFilterOptions value={extraFilters} onChange={setExtraFilters} onClear={() => { setQuery(""); setFilter("all"); setExtraFilters(defaultDirectoryFilters); }} />
            <div className={styles.segmented} role="group" aria-label="Layout">
              <button
                type="button"
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                onClick={() => setView("grid")}
              >
                {Icon.grid}
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                aria-label="List view"
                onClick={() => setView("list")}
              >
                {Icon.list}
              </button>
            </div>
          </div>

          {searching && (
            <p className={styles.resultNote}>
              {visible.length} {visible.length === 1 ? "result" : "results"} for “{query.trim()}”
              across all categories
            </p>
          )}

          {visible.length > 0 ? (
            <div
              key={`${parentId}-${searching}`}
              className={view === "grid" ? styles.grid : styles.list}
            >
              {visible.map((node) => {
                const index = siblings.findIndex((item) => item.id === node.id);
                const count = childCount(node.id);
                const path = lineage(node.parent)
                  .map((item) => item.name)
                  .join(" › ");
                return (
                  <article
                    key={node.id}
                    data-card-id={node.id}
                    data-dragging={preview?.id === node.id}
                    data-drop-target={over === node.id && preview?.id !== node.id}
                    data-inactive={!node.is_active}
                    aria-label={node.name}
                    className={styles.card}
                    style={{ order: preview ? preview.order.indexOf(node.id) : undefined }}
                  >
                    <a
                      href={categoryUrl(node.id)}
                      className={styles.cardLink}
                      aria-label={`Open ${node.name}`}
                      onClick={openHandler(node.id)}
                    />
                    <div className={styles.cardMedia}>
                      <MediaImage src={node.image_url} alt={node.name} width={240} height={150} />
                      <span
                        className={`${styles.pill} ${styles.mediaPill}`}
                        data-tone={node.is_active ? "ok" : "off"}
                      >
                        {node.is_active ? "Active" : "Inactive"}
                      </span>
                      {canReorder && (
                        <button
                          type="button"
                          className={styles.dragHandle}
                          aria-label={`Drag ${node.name}`}
                          title="Drag to reorder"
                          style={{ touchAction: "none" }}
                          onPointerDown={(event) => {
                            if (event.button !== 0 || !event.isPrimary || drag.current) return;
                            drag.current = {
                              id: node.id,
                              pointerId: event.pointerId,
                              overId: null,
                              x: event.clientX,
                              y: event.clientY,
                              moved: false,
                            };
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            const active = drag.current;
                            if (!active || active.pointerId !== event.pointerId) return;
                            active.moved ||=
                              Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6;
                            if (!active.moved) return;
                            event.preventDefault();
                            if (!preview) setPreview({ id: active.id, order: sorted.map(item => item.id) });
                            if (!floating) {
                              const rect = event.currentTarget.closest("article")!.getBoundingClientRect();
                              setFloating({ node, x: event.clientX - rect.width * .7, y: event.clientY - 24, width: Math.min(rect.width, 300) });
                            }
                            if (floatingRef.current) {
                              const tilt = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "" : ` rotateX(6deg) rotateY(${Math.max(-12, Math.min(12, (event.clientX - active.x) / 25))}deg) rotateZ(-2deg)`;
                              floatingRef.current.style.transform = `perspective(900px) translate3d(${event.clientX - floatingRef.current.offsetWidth * .7}px, ${event.clientY - 24}px, 0)${tilt}`;
                            }
                            const element = target(event.clientX, event.clientY);
                            setOver(element ? Number(element.dataset.cardId) : null);
                            if (element) {
                              const overId = Number(element.dataset.cardId);
                              if (overId !== active.id) updatePreview(active.id, overId);
                            } else if (!preview) {
                              setPreview({ id: active.id, order: sorted.map((item) => item.id) });
                            }
                            if (event.clientY < 90) window.scrollBy(0, -16);
                            if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
                          }}
                          onPointerUp={(event) => {
                            const active = drag.current;
                            if (!active || active.pointerId !== event.pointerId) return;
                            const order = preview?.order;
                            const validDrop = !!target(event.clientX, event.clientY);
                            cancelDrag();
                            if (event.currentTarget.hasPointerCapture(event.pointerId))
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            if (!active?.moved || !order || !validDrop) return;
                            const original = sorted.map((item) => item.id);
                            if (order.every((id, i) => id === original[i])) return;
                            const position = order.indexOf(active.id);
                            commitMove(active.id, order[position + 1] ?? null);
                          }}
                          onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
                          onLostPointerCapture={(event) => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
                        >
                          <svg viewBox="0 0 20 20" aria-hidden="true">
                            <circle cx="7" cy="5" r="1.3" />
                            <circle cx="13" cy="5" r="1.3" />
                            <circle cx="7" cy="10" r="1.3" />
                            <circle cx="13" cy="10" r="1.3" />
                            <circle cx="7" cy="15" r="1.3" />
                            <circle cx="13" cy="15" r="1.3" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <h3>{node.name}</h3>
                      <p className={styles.cardPath}>
                        {searching ? path || "Top level" : `/${node.slug}`}
                      </p>
                      <div className={styles.cardMeta}>
                        <span className={styles.metaChip}>
                          {Icon.folder}
                          {count} {count === 1 ? "subcategory" : "subcategories"}
                        </span>
                        {node.show_on_homepage && (
                          <span className={styles.metaChip} data-tone="info">
                            Homepage
                          </span>
                        )}
                        {node.starting_price && (
                          <span className={styles.metaChip}>
                            From {inr.format(Number(node.starting_price))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.actionButton} onClick={() => onEdit(node)}>
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.actionDanger}`}
                        onClick={() => onDelete(node)}
                      >
                        Delete
                      </button>
                      {canReorder && (
                        <span className={styles.orderButtons}>
                          <button
                            className={styles.iconButton}
                            aria-label={`Move ${node.name} up`}
                            disabled={index <= 0}
                            onClick={() => commitMove(node.id, siblings[index - 1].id)}
                          >
                            {Icon.up}
                          </button>
                          <button
                            className={styles.iconButton}
                            aria-label={`Move ${node.name} down`}
                            disabled={index < 0 || index === siblings.length - 1}
                            onClick={() => commitMove(node.id, siblings[index + 2]?.id ?? null)}
                          >
                            {Icon.down}
                          </button>
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
              {!searching && view === "grid" && (
                <button type="button" className={styles.addTile} style={{ order: siblings.length + 1 }} onClick={onAdd}>
                  <span className={styles.addTileIcon}>{Icon.plus}</span>
                  <span>
                    {currentCategory
                      ? `New subcategory in ${currentCategory.name}`
                      : "New category"}
                  </span>
                </button>
              )}
              {!searching && (
                <div
                  data-card-id="0"
                  className={styles.dropEnd}
                  style={{ order: siblings.length + 2 }}
                  aria-label="End of category list"
                />
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>{Icon.folder}</span>
              <h2>
                {searching
                  ? "No matching categories"
                  : currentCategory
                    ? `${currentCategory.name} has no subcategories yet`
                    : "No categories yet"}
              </h2>
              <p>
                {searching
                  ? "Try a different name or slug, or clear the status filter."
                  : filter !== "all"
                    ? `No ${filter} categories here. Switch the filter to “All” to see everything.`
                    : "Create the first one to start building this part of your catalogue."}
              </p>
              {!searching && filter === "all" && (
                <button type="button" className={styles.ghostButton} onClick={onAdd}>
                  {Icon.plus}
                  Create {currentCategory ? "subcategory" : "category"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {(saving > 0 || moveError) && (
        <div className={styles.toast} data-tone={moveError ? "error" : "info"}>
          {moveError ? (
            <p role="alert">{moveError}</p>
          ) : (
            <p role="status">
              <span className={styles.spinner} aria-hidden="true" />
              Syncing order…
            </p>
          )}
          {moveError && (
            <button type="button" className={styles.textButton} onClick={() => setMoveError(null)}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </section>
  );
}
