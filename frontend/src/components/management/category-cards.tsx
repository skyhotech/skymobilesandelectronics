"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryTreeSnapshotSchema, type HomepageCategory } from "@/lib/categories";
import { managementApi, type Reference } from "@/lib/management-api";
import { MediaImage } from "@/components/media/media-image";
import styles from "./management.module.css";

const categoryUrl = (id: number | null) =>
  `/management/admin/categories${id === null ? "" : `/${id}`}`;

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
  const [over, setOver] = useState<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const snapshot = useQuery({
    queryKey: ["management", "categories", "tree"],
    queryFn: async () => categoryTreeSnapshotSchema.parse(await managementApi("categories/tree/")),
    staleTime: 0,
  });
  const move = useMutation({
    mutationFn: ({ id, before }: { id: number; before: number | null }) =>
      managementApi("categories/move/", "POST", {
        id,
        parent: parentId,
        before,
        revision: snapshot.data!.revision,
      }),
    onSettled: () => {
      cache.invalidateQueries({ queryKey: ["management", "categories"] });
      cache.invalidateQueries({ queryKey: ["management", "references"] });
    },
  });
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
  const siblings = nodes
    .filter((node) => node.parent === parentId && (inactive || node.is_active))
    .sort(
      (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name) || a.id - b.id,
    );
  const visible = siblings.filter((node) =>
    `${node.name} ${node.slug}`.toLowerCase().includes(search.toLowerCase()),
  );
  const target = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-card-id]");
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
              data-over={over === node.id}
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
                  disabled={move.isPending || Boolean(search)}
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
                    const element = target(event.clientX, event.clientY);
                    setOver(element ? Number(element.dataset.cardId) : null);
                    if (event.clientY < 90) window.scrollBy(0, -16);
                    if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
                  }}
                  onPointerUp={(event) => {
                    const active = drag.current;
                    drag.current = null;
                    setOver(null);
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    if (!active?.moved) return;
                    const element = target(event.clientX, event.clientY);
                    if (!element) return;
                    const destinationId = Number(element.dataset.cardId);
                    if (destinationId === active.id) return;
                    const from = siblings.findIndex((item) => item.id === active.id);
                    const to = siblings.findIndex((item) => item.id === destinationId);
                    const before =
                      destinationId === 0
                        ? null
                        : from < to
                          ? (siblings[to + 1]?.id ?? null)
                          : destinationId;
                    move.mutate({ id: active.id, before });
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    setOver(null);
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
                  disabled={index === 0 || move.isPending || Boolean(search)}
                  onClick={() => move.mutate({ id: node.id, before: siblings[index - 1].id })}
                >
                  ↑
                </button>
                <button
                  className={styles.secondary}
                  aria-label={`Move ${node.name} down`}
                  disabled={index === siblings.length - 1 || move.isPending || Boolean(search)}
                  onClick={() =>
                    move.mutate({ id: node.id, before: siblings[index + 2]?.id ?? null })
                  }
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
      {move.isPending && <p role="status">Saving order…</p>}
      {move.error && (
        <p role="alert" className={styles.error}>
          {move.error.message}
        </p>
      )}
    </section>
  );
}
