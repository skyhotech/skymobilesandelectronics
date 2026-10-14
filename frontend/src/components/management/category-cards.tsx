"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryTreeSnapshotSchema, type HomepageCategory } from "@/lib/categories";
import { managementApi, type Reference } from "@/lib/management-api";
import { MediaImage } from "@/components/media/media-image";
import styles from "./management.module.css";

type Snapshot = ReturnType<typeof categoryTreeSnapshotSchema.parse>;
const treeKey = ["management", "categories", "tree"];

const categoryUrl = (id: number | null) =>
  `/management/admin/categories${id === null ? "" : `/${id}`}`;

const sortSiblings = (a: HomepageCategory, b: HomepageCategory) =>
  a.display_order - b.display_order || a.name.localeCompare(b.name) || a.id - b.id;

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

export function CategoryCards({
  parentId,
  search,
  onEdit,
  onDelete,
}: {
  parentId: number | null;
  search: string;
  onEdit: (entry: Reference) => void;
  onDelete: (entry: Reference) => void;
}) {
  const cache = useQueryClient();
  const [inactive, setInactive] = useState(false);
  const [preview, setPreview] = useState<{ id: number; order: number[] } | null>(null);
  const [saving, setSaving] = useState(0);
  const [moveError, setMoveError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
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
  const nodes = snapshot.data?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestors: HomepageCategory[] = [];
  let current = parentId === null ? undefined : byId.get(parentId);
  const seen = new Set<number>();
  while (current && !seen.has(current.id)) {
    ancestors.unshift(current);
    seen.add(current.id);
    current = current.parent === null ? undefined : byId.get(current.parent);
  }
  const sorted = nodes
    .filter((node) => node.parent === parentId && (inactive || node.is_active))
    .sort(sortSiblings);
  // While dragging, show the live preview order so cards swap instantly under the pointer.
  const siblings = preview
    ? preview.order.map((id) => byId.get(id)).filter((node): node is HomepageCategory => !!node)
    : sorted;
  const visible = siblings.filter((node) =>
    `${node.name} ${node.slug}`.toLowerCase().includes(search.toLowerCase()),
  );
  const target = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-card-id]");
  /** Move the dragged card to the hovered card's slot in the preview order. */
  const updatePreview = (activeId: number, overId: number) => {
    const base = preview?.order ?? sorted.map((node) => node.id);
    const order = base.filter((id) => id !== activeId);
    const overIndex = order.indexOf(overId);
    const currentIndex = base.indexOf(activeId);
    if (overId === 0 || overIndex < 0) order.push(activeId);
    else order.splice(currentIndex <= overIndex ? overIndex + 1 : overIndex, 0, activeId);
    if (preview && order.every((id, i) => id === preview.order[i])) return;
    setPreview({ id: activeId, order });
  };
  if (snapshot.isPending) return <p role="status">Loading categories…</p>;
  if (snapshot.error)
    return (
      <p role="alert">
        {snapshot.error.message} <button onClick={() => snapshot.refetch()}>Retry</button>
      </p>
    );
  if (parentId !== null && !byId.has(parentId))
    return (
      <p role="alert">
        Category not found. <Link href={categoryUrl(null)}>Back to categories</Link>
      </p>
    );
  return (
    <section aria-label="Category cards" className={styles.categoryBrowser}>
      <nav aria-label="Category breadcrumbs" className={styles.categoryBreadcrumbs}>
        <Link href={categoryUrl(null)}>Main categories</Link>
        {ancestors.map((node, index) => (
          <span key={node.id}>
            <span aria-hidden="true"> / </span>
            <Link
              href={categoryUrl(node.id)}
              aria-current={index === ancestors.length - 1 ? "page" : undefined}
            >
              {node.name}
            </Link>
          </span>
        ))}
      </nav>
      <div className={styles.categoryBrowserHeading}>
        <div>
          <h2>{ancestors.at(-1)?.name || "Main categories"}</h2>
          <p>
            {parentId === null ? "Choose a category to manage its subcategories." : "Subcategories"}{" "}
            · {visible.length} {visible.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={inactive}
            onChange={(event) => setInactive(event.target.checked)}
          />
          Show inactive
        </label>
      </div>
      <div className={styles.categoryCardGrid}>
        {visible.map((node) => {
          const index = siblings.findIndex((item) => item.id === node.id);
          const count = nodes.filter((item) => item.parent === node.id).length;
          return (
            <article
              key={node.id}
              data-card-id={node.id}
              data-dragging={preview?.id === node.id}
              aria-label={node.name}
              className={styles.categoryAdminCard}
            >
              <div className={styles.categoryCardTop}>
                <span className={`${styles.badge} ${node.is_active ? "" : styles.inactive}`}>
                  {node.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  className={styles.categoryDragHandle}
                  aria-label={`Drag ${node.name}`}
                  title="Drag to reorder"
                  disabled={Boolean(search)}
                  style={{ touchAction: "none" }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    drag.current = {
                      id: node.id,
                      x: event.clientX,
                      y: event.clientY,
                      moved: false,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const active = drag.current;
                    if (!active) return;
                    active.moved ||=
                      Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6;
                    if (!active.moved) return;
                    const element = target(event.clientX, event.clientY);
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
                    const order = preview?.order;
                    drag.current = null;
                    setPreview(null);
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    if (!active?.moved || !order) return;
                    const original = sorted.map((item) => item.id);
                    if (order.every((id, i) => id === original[i])) return;
                    const position = order.indexOf(active.id);
                    commitMove(active.id, order[position + 1] ?? null);
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    setPreview(null);
                  }}
                >
                  ⠿
                </button>
              </div>
              <Link
                href={categoryUrl(node.id)}
                className={styles.categoryCardOpen}
                aria-label={`Open ${node.name}`}
              >
                <MediaImage src={node.image_url} alt={node.name} width={240} height={150} />
                <h3>{node.name}</h3>
                <span>
                  {count} {count === 1 ? "subcategory" : "subcategories"}{" "}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
              <div className={styles.categoryCardActions}>
                <button className={styles.secondary} onClick={() => onEdit(node)}>
                  Edit
                </button>
                <button className={styles.danger} onClick={() => onDelete(node)}>
                  Delete
                </button>
                <button
                  className={styles.secondary}
                  aria-label={`Move ${node.name} up`}
                  disabled={index === 0 || Boolean(search)}
                  onClick={() => commitMove(node.id, siblings[index - 1].id)}
                >
                  ↑
                </button>
                <button
                  className={styles.secondary}
                  aria-label={`Move ${node.name} down`}
                  disabled={index === siblings.length - 1 || Boolean(search)}
                  onClick={() => commitMove(node.id, siblings[index + 2]?.id ?? null)}
                >
                  ↓
                </button>
              </div>
            </article>
          );
        })}
        {visible.length > 0 && (
          <div
            data-card-id="0"
            className={styles.categoryDropEnd}
            aria-label="End of category list"
          />
        )}
      </div>
      {!visible.length && (
        <p className={styles.empty}>
          {search
            ? "No matching categories in this folder."
            : "No categories here yet. Use Add category to create one."}
        </p>
      )}
      {saving > 0 && (
        <p role="status" className={styles.categorySaving}>
          Syncing order…
        </p>
      )}
      {moveError && (
        <p role="alert" className={styles.error}>
          {moveError}
        </p>
      )}
    </section>
  );
}
