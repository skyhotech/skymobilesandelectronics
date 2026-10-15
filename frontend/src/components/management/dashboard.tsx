"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  allReferences,
  managementApi,
  ManagementError,
  type Page,
  type Product,
  type Reference,
  type Session,
} from "@/lib/management-api";
import styles from "./management.module.css";
import { CategoryForm } from "./category-form";
import { CategoryCards, categoryUrl } from "./category-cards";
import { MediaUploadField } from "./media-upload-field";
import { BrandWorkspace } from "./brand-workspace";

type Resource = "products" | "brands" | "categories";
type Entry = Reference | Product;
const singular: Record<Resource, string> = {
  products: "product",
  brands: "brand",
  categories: "category",
};
const money = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount with up to two decimals");
const referenceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  slug: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, digits, hyphens or underscores"),
  is_active: z.boolean(),
  image_url: z.string(),
  show_on_homepage: z.boolean(),
  display_order: z.string().regex(/^\d{0,9}$/, "Use a whole number"),
});
const productSchema = referenceSchema.extend({
  sku: z.string().trim().min(1).max(64),
  description: z.string(),
  brand: z.string().min(1, "Select a brand"),
  category: z.string().min(1, "Select a category"),
  price: money,
  compare_at_price: z.union([money, z.literal("")]),
});
type Fields = z.infer<typeof productSchema>;

export function ManagementDashboard({
  section = "products",
  parentId = null,
}: {
  section?: Resource;
  parentId?: number | null;
}) {
  const router = useRouter();
  const cache = useQueryClient();
  const headerRef = useRef<HTMLElement>(null);
  const resource = section;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [notice, setNotice] = useState("");
  // Category folder is client state: opening a subcategory is instant (no route round-trip).
  const [categoryParent, setCategoryParent] = useState<number | null>(parentId);
  const [routeParent, setRouteParent] = useState<number | null>(parentId);
  if (routeParent !== parentId) {
    // The route itself changed (e.g. sidebar link or server navigation) — follow it.
    setRouteParent(parentId);
    setCategoryParent(parentId);
  }
  useEffect(() => {
    if (resource !== "categories") return;
    const sync = () => {
      const match = window.location.pathname.match(
        /\/management\/admin\/categories(?:\/(\d+))?\/?$/,
      );
      if (match) setCategoryParent(match[1] ? Number(match[1]) : null);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [resource]);
  const openCategory = (id: number | null) => {
    const url = categoryUrl(id);
    if (window.location.pathname !== url) window.history.pushState(null, "", url);
    setCategoryParent(id);
    setNotice("");
    window.scrollTo({ top: 0 });
  };
  const session = useQuery({
    queryKey: ["management", "session"],
    queryFn: () => managementApi<Session>("session/"),
    staleTime: 0,
    retry: false,
  });
  const entries = useQuery({
    queryKey: ["management", resource, search, page],
    queryFn: () =>
      managementApi<Page<Entry>>(`${resource}/?search=${encodeURIComponent(search)}&page=${page}`),
    enabled: Boolean(session.data?.user) && resource === "products",
    retry: false,
  });
  const logout = useMutation({
    mutationFn: () => managementApi<Session>("session/", "DELETE"),
    onSuccess: () => {
      cache.removeQueries({ queryKey: ["management"] });
      router.replace("/management/admin/login");
    },
  });
  const remove = useMutation({
    mutationFn: (entry: Entry) => managementApi(`${resource}/${entry.id}/`, "DELETE"),
    onSuccess: () => {
      setDeleting(null);
      setNotice("Deleted successfully.");
      if (page > 1 && entries.data?.results.length === 1) setPage(page - 1);
      cache.invalidateQueries({ queryKey: ["management", resource] });
      cache.invalidateQueries({ queryKey: ["management", "references"] });
    },
  });
  useEffect(() => {
    if (session.data && !session.data.user) router.replace("/management/admin/login");
  }, [session.data, router]);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => header.parentElement?.style.setProperty("--admin-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [session.data?.user]);
  const permissionError =
    entries.error instanceof ManagementError &&
    (entries.error.status === 401 || entries.error.status === 403);
  if (!session.data?.user)
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginCard}>
          <h1>Store management</h1>
          {session.error ? (
            <>
              <p role="alert" className={styles.error}>
                {session.error.message}
              </p>
              <button className={styles.secondary} onClick={() => session.refetch()}>
                Retry connection
              </button>
            </>
          ) : (
            <p role="status">Checking your session…</p>
          )}
          <Link className={styles.backLink} href="/management/admin/login">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  return (
    <div className={styles.shell}>
      <header ref={headerRef} className={styles.header} aria-label="Management navigation">
        <Link href="/management/admin" className={styles.headerBrand} aria-label="SKY management home">
          <Image src="/images/homepage/545193f58191.webp" alt="SKY Mobile & Electronics" width={48} height={48} priority className={styles.headerLogo} />
          <div>
          <strong>SKY Management</strong>
          <span>Catalog & store operations</span>
          </div>
        </Link>
        <div className={styles.headerActions}>
          <span>{session.data.user.username}</span>
          <Link href="/">View website ↗</Link>
          <button
            className={styles.secondary}
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className={styles.dashboardLayout}>
        <aside className={styles.sidebar} aria-label="Management sidebar" tabIndex={0}>
          <div>
            <p className={styles.eyebrow}>MANAGEMENT</p>
            <h2>Store workspace</h2>
            <p className={styles.sidebarDescription}>Your catalog, organized.</p>
          </div>
          <p className={styles.sidebarSection}>CATALOG</p>
          <nav className={styles.sidebarNav} aria-label="Management sections">
            {(["products", "brands", "categories"] as Resource[]).map((item) => (
              <Link
                key={item}
                href={`/management/admin/${item}`}
                className={`${styles.sidebarLink} ${resource === item ? styles.activeTab : ""}`}
                aria-current={resource === item ? "page" : undefined}
              >
                <span className={styles.sidebarIcon} aria-hidden="true">
                  {item === "products" ? "P" : item === "brands" ? "B" : "C"}
                </span>
                <span>{item[0].toUpperCase() + item.slice(1)}</span>
                <span className={styles.sidebarArrow} aria-hidden="true">
                  &rsaquo;
                </span>
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <p>All catalog changes are saved through the SKY API.</p>
          </div>
        </aside>
        <main className={`${styles.main} ${styles.dashboardMain}`}>
          {resource === "products" && (
            <div className={styles.intro}>
              <div>
                <p className={styles.eyebrow}>YOUR STORE WORKSPACE</p>
                <h1>Manage your catalog</h1>
                <p className={styles.muted}>
                  Create products, organize brands and keep your catalog up to date.
                </p>
              </div>
            </div>
          )}

          {logout.error && (
            <p className={styles.error} role="alert">
              {logout.error.message}
            </p>
          )}
          {notice && (
            <p className={styles.success} role="status">
              {notice}
            </p>
          )}
          {resource === "products" && (
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                aria-label={`Search ${resource}`}
                placeholder={`Search ${resource}…`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <button
                className={styles.primary}
                disabled={permissionError}
                onClick={() => setEditing("new")}
              >
                Add {singular[resource]}
              </button>
            </div>
          )}
          {resource === "brands" && <BrandWorkspace onAdd={() => setEditing("new")} onEdit={setEditing} onDelete={entry => { remove.reset(); setDeleting(entry); }} />}
          {resource === "categories" && (
            <CategoryCards
              parentId={categoryParent}
              onNavigate={openCategory}
              onAdd={() => setEditing("new")}
              onEdit={setEditing}
              onDelete={(entry) => {
                remove.reset();
                setDeleting(entry);
              }}
            />
          )}
          {resource === "products" && (
            <section className={styles.panel} aria-label={`${resource} list`}>
              {entries.isPending ? (
                <p className={styles.empty} role="status">
                  Loading {resource}…
                </p>
              ) : entries.error ? (
                <div className={styles.empty}>
                  <p className={styles.error} role="alert">
                    {entries.error.message}
                  </p>
                  <button className={styles.secondary} onClick={() => entries.refetch()}>
                    Retry
                  </button>
                </div>
              ) : !entries.data?.results.length ? (
                <div className={styles.empty}>
                  No {resource} found.{" "}
                  {search
                    ? "Try a different search."
                    : `Add your first ${singular[resource]} to get started.`}
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        {resource === "products" && (
                          <>
                            <th>SKU</th>
                            <th>Price</th>
                          </>
                        )}
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.data.results.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <strong>{entry.name}</strong>
                            <small>{entry.slug}</small>
                          </td>
                          {"sku" in entry && (
                            <>
                              <td>{entry.sku}</td>
                              <td>
                                {new Intl.NumberFormat("en-IN", {
                                  style: "currency",
                                  currency: entry.currency,
                                }).format(Number(entry.price))}
                              </td>
                            </>
                          )}
                          <td>
                            <span
                              className={`${styles.badge} ${entry.is_active ? "" : styles.inactive}`}
                            >
                              {entry.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                className={styles.secondary}
                                onClick={() => setEditing(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className={styles.danger}
                                onClick={() => {
                                  remove.reset();
                                  setDeleting(entry);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {entries.data && (
                <div className={styles.pagination}>
                  <span>
                    {entries.data.count} {resource} · Page {page}
                  </span>
                  <div className={styles.actions}>
                    <button
                      className={styles.secondary}
                      disabled={page === 1 || entries.isFetching}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={!entries.data.next || entries.isFetching}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          {resource === "products" && (
            <p className={styles.notice}>
              Catalog changes are saved in MySQL through Django REST Framework. Orders, checkout and
              payments are being developed separately.
            </p>
          )}
          {editing && resource === "categories" && (
            <Modal
              title={`${editing === "new" ? "Add" : "Edit"} category`}
              onClose={() => setEditing(null)}
            >
              <CategoryForm
                parentId={categoryParent}
                entry={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  setNotice("Saved successfully.");
                  cache.invalidateQueries({ queryKey: ["management", "categories"] });
                  cache.invalidateQueries({ queryKey: ["management", "references"] });
                }}
              />
            </Modal>
          )}
          {editing && resource !== "categories" && (
            <Editor
              resource={resource}
              entry={editing}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                setNotice("Saved successfully.");
                cache.invalidateQueries({ queryKey: ["management", resource] });
                cache.invalidateQueries({ queryKey: ["management", "references"] });
              }}
            />
          )}
          {deleting && (
            <Modal
              title={`Delete ${singular[resource]}?`}
              onClose={() => {
                if (!remove.isPending) setDeleting(null);
              }}
            >
              <p className={styles.muted}>
                Permanently delete “{deleting.name}”? This cannot be undone. Referenced items may be
                protected.
              </p>
              {remove.error && (
                <p role="alert" className={styles.error}>
                  {remove.error.message}
                </p>
              )}
              <div className={styles.formActions}>
                <button
                  className={styles.secondary}
                  disabled={remove.isPending}
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.danger}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(deleting)}
                >
                  {remove.isPending ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            </Modal>
          )}
        </main>
      </div>
    </div>
  );
}

function Editor({
  resource,
  entry,
  onClose,
  onSaved,
}: {
  resource: Resource;
  entry: Entry | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const product = entry !== "new" && "sku" in entry ? entry : null;
  const [mediaPending, setMediaPending] = useState(false);
  const form = useForm<Fields>({
    resolver: zodResolver(
      resource === "products"
        ? productSchema
        : referenceSchema.extend({
            sku: z.string(),
            description: z.string(),
            brand: z.string(),
            category: z.string(),
            price: z.string(),
            compare_at_price: z.string(),
          }),
    ),
    defaultValues: {
      name: entry === "new" ? "" : entry.name,
      slug: entry === "new" ? "" : entry.slug,
      is_active: entry === "new" ? true : entry.is_active,
      show_on_homepage: entry === "new" ? resource === "brands" : Boolean(entry.show_on_homepage),
      display_order: entry === "new" ? "0" : String(entry.display_order ?? 0),
      image_url:
        entry === "new"
          ? ""
          : (entry as Reference & { image_url?: string; logo_url?: string }).image_url ||
            (entry as Reference & { logo_url?: string }).logo_url ||
            "",
      sku: product?.sku || "",
      description: product?.description || "",
      brand: product ? String(product.brand) : "",
      category: product ? String(product.category) : "",
      price: product?.price || "",
      compare_at_price: product?.compare_at_price || "",
    },
  });
  const references = useQuery({
    queryKey: ["management", "references"],
    queryFn: async () => ({
      brands: await allReferences("brands"),
      categories: await allReferences("categories"),
    }),
    enabled: resource === "products",
    retry: false,
  });
  const save = useMutation({
    mutationFn: (values: Fields) => {
      const { show_on_homepage, display_order, ...rest } = values;
      const data =
        resource === "products"
          ? {
              ...rest,
              brand: Number(values.brand),
              category: Number(values.category),
              compare_at_price: values.compare_at_price || null,
              currency: "INR",
            }
          : {
              name: values.name,
              slug: values.slug,
              is_active: values.is_active,
              logo_url: values.image_url,
              show_on_homepage,
              display_order: Number(display_order || 0),
            };
      return managementApi(
        `${resource}/${entry === "new" ? "" : `${entry.id}/`}`,
        entry === "new" ? "POST" : "PATCH",
        data,
      );
    },
    onSuccess: onSaved,
  });
  const selectedMedia = useWatch({ control: form.control, name: "image_url" });
  const errors = form.formState.errors;
  return (
    <Modal
      title={`${entry === "new" ? "Add" : "Edit"} ${singular[resource]}`}
      onClose={() => {
        if (!save.isPending) onClose();
      }}
    >
      <form className={styles.form} onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <label>
          Name
          <input {...form.register("name")} />
        </label>
        <label>
          Slug
          <input aria-label="Slug" {...form.register("slug")} />
          <small className={styles.muted}>Unique URL identifier, for example iphone-16-blue.</small>
        </label>
        <MediaUploadField
          value={selectedMedia}
          kind={resource}
          onPendingChange={setMediaPending}
          onChange={(value) => form.setValue("image_url", value, { shouldDirty: true })}
        />
        {resource === "products" && (
          <>
            <label>
              SKU
              <input {...form.register("sku")} />
            </label>
            <label>
              Description
              <textarea {...form.register("description")} />
            </label>
            {references.error && (
              <p role="alert" className={styles.error}>
                {references.error.message}{" "}
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => references.refetch()}
                >
                  Retry
                </button>
              </p>
            )}
            {references.isPending && (
              <p role="status" className={styles.muted}>
                Loading brands and categories…
              </p>
            )}
            {references.data &&
              (!references.data.brands.length || !references.data.categories.length) && (
                <p className={styles.notice}>
                  Create at least one brand and category using the corresponding tabs before adding
                  a product.
                </p>
              )}
            <div className={styles.formGrid}>
              <label>
                Brand
                <select aria-label="Brand" {...form.register("brand")}>
                  <option value="">Select brand</option>
                  {references.data?.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select aria-label="Category" {...form.register("category")}>
                  <option value="">Select category</option>
                  {references.data?.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Price
                <input inputMode="decimal" {...form.register("price")} />
              </label>
              <label>
                Compare at price
                <input inputMode="decimal" {...form.register("compare_at_price")} />
              </label>
            </div>
          </>
        )}
        <label className={styles.check}>
          <input type="checkbox" {...form.register("is_active")} />
          Active
        </label>
        {resource === "brands" && (
          <>
            <label className={styles.check}>
              <input type="checkbox" {...form.register("show_on_homepage")} />
              Show on homepage
            </label>
            <label>
              Display order
              <input inputMode="numeric" {...form.register("display_order")} />
              <small className={styles.muted}>
                Lower numbers appear first in “Shop Your Favourite Brands”. A logo is required to
                show a brand on the homepage.
              </small>
            </label>
          </>
        )}
        {Object.keys(errors).length > 0 && (
          <div role="alert" className={styles.error}>
            {Object.entries(errors).map(([key, value]) => (
              <p key={key}>
                {key.replaceAll("_", " ")}: {value.message}
              </p>
            ))}
          </div>
        )}
        {save.error && (
          <p role="alert" className={styles.error}>
            {save.error.message}
          </p>
        )}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={save.isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.primary}
            disabled={
              save.isPending || mediaPending || (resource === "products" && !references.isSuccess)
            }
          >
            {save.isPending ? "Saving…" : `Save ${singular[resource]}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const container = dialog.current;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        ) || [],
      );
    (focusable()[0] || container)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    container?.addEventListener("keydown", handleKey);
    return () => {
      container?.removeEventListener("keydown", handleKey);
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialog}
      >
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
