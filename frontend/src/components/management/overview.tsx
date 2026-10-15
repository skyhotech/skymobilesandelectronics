"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { managementApi } from "@/lib/management-api";
import { MediaImage } from "@/components/media/media-image";
import { formatPrice } from "@/lib/products";
import styles from "./overview.module.css";

const count = z.number().int().nonnegative();
const group = z.object({ total: count, active: count, homepage: count });
const overviewSchema = z.object({
  brands: group, categories: group,
  products: z.object({ total: count, active: count, published: count, missing_images: count }),
  recent_products: z.array(z.object({
    id: z.number().int(), name: z.string(), brand: z.number().int(), brand_name: z.string(),
    price: z.string(), currency: z.literal("INR"), is_active: z.boolean(),
    image_url: z.string(), updated_at: z.string().datetime({ offset: true }),
  })),
});
const arrow = <span aria-hidden="true">↗</span>;
const icons = {
  products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
  brands: <><path d="M3 4h10l8 8-9 9-9-9V4Z" /><circle cx="8" cy="9" r="1" /></>,
  categories: <path d="M3 6h6l2 3h10v12H3V6Z" />,
  homepage: <><path d="M3 4h18v16H3zM3 9h18M8 9v11" /></>,
};
function Glyph({ kind }: { kind: keyof typeof icons }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[kind]}</svg>;
}

export function ManagementOverview() {
  const overview = useQuery({
    queryKey: ["management", "overview"],
    queryFn: async () => overviewSchema.parse(await managementApi("overview/")),
    staleTime: 0, refetchInterval: 30000, refetchIntervalInBackground: false, retry: false,
  });
  const data = overview.data;
  return <section className={styles.workspace} aria-label="Management dashboard">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>YOUR STORE, AT A GLANCE</p><h1>Dashboard</h1><p>Everything you need to keep SKY moving.</p></div>
      <div className={styles.refresh}><span>{overview.dataUpdatedAt ? `Updated ${new Date(overview.dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Connecting to your store"}</span><button disabled={overview.isFetching} onClick={() => overview.refetch()} aria-label="Refresh dashboard"><span aria-hidden="true">&#8635;</span> {overview.isFetching ? "Updating..." : "Refresh dashboard"}</button></div>
    </header>
    {overview.isPending && <div className={styles.loading} role="status">Loading your store overview...</div>}
    {overview.error && <div className={styles.error} role="alert">{data ? "Updates are unavailable. Showing the last loaded overview." : "Unable to load your store overview."} Please try Refresh dashboard.</div>}
    {data && <>
      <div className={styles.metrics}>
        {(["products", "brands", "categories"] as const).map(kind => <article className={styles.metric} key={kind} aria-label={`${kind} overview`}>
          <div className={styles.metricTop}><h2>{kind[0].toUpperCase() + kind.slice(1)}</h2><span className={styles.icon} data-tone={kind}><Glyph kind={kind} /></span></div>
          <dl><div><dt>Total {kind}</dt><dd>{data[kind].total}</dd></div></dl>
          <p><span className={styles.dot} />{data[kind].active} active <span className={styles.separator}>/</span> {data[kind].total - data[kind].active} inactive</p>
          <Link href={`/management/admin/${kind === "products" ? "brands" : kind}`}>{kind === "products" ? "Manage products by brand" : `Manage ${kind}`} {arrow}</Link>
        </article>)}
        <article className={`${styles.metric} ${styles.featureMetric}`} aria-label="Homepage overview"><div className={styles.metricTop}><h2>Homepage</h2><span className={styles.icon}><Glyph kind="homepage" /></span></div><strong className={styles.total}>{data.brands.homepage + data.categories.homepage}</strong><p>Published brand &amp; category placements</p><Link href="/" target="_blank" rel="noopener noreferrer">View storefront {arrow}</Link></article>
      </div>
      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="recent-catalog-title">
          <div className={styles.panelHeader}><div><p className={styles.eyebrow}>CATALOG ACTIVITY</p><h2 id="recent-catalog-title">Recently updated products</h2></div><Link href="/management/admin/brands">All products {arrow}</Link></div>
          {data.recent_products.length ? <div className={styles.recentList}>{data.recent_products.map(product => <Link className={styles.product} key={product.id} href={`/management/admin/brands?${new URLSearchParams({ brand: String(product.brand), search: product.name })}`}>
            <div className={styles.thumbnail}><MediaImage src={product.image_url} alt="" width={48} height={48} /></div>
            <div className={styles.productName}><strong>{product.name}</strong><span>{product.brand_name} &middot; {new Date(product.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span></div>
            <div className={styles.productMeta}><strong>{formatPrice(product.price)}</strong><span data-active={product.is_active}>{product.is_active ? "Active" : "Inactive"}</span></div>{arrow}
          </Link>)}</div> : <div className={styles.empty}><span className={styles.emptyIcon}><Glyph kind="products" /></span><h3>Your next great product starts here</h3><p>Add products inside a brand to start building your catalog.</p><Link href="/management/admin/brands">Open brand directory {arrow}</Link></div>}
        </section>
        <section className={styles.panel} aria-labelledby="visibility-title"><div className={styles.panelHeader}><div><p className={styles.eyebrow}>STOREFRONT VISIBILITY</p><h2 id="visibility-title">Ready for your customers</h2></div></div>
          <div className={styles.visibility}>{[
            { name: "Visible products", value: data.products.published, total: data.products.total, note: "Active product, brand and category" },
            { name: "Homepage brands", value: data.brands.homepage, total: data.brands.total, note: "Published with a logo" },
            { name: "Homepage categories", value: data.categories.homepage, total: data.categories.total, note: "Published with valid visibility settings" },
          ].map(item => <div className={styles.progressItem} key={item.name}><div><strong>{item.name}</strong><span>{item.value} / {item.total}</span></div><progress aria-label={item.name} value={item.value} max={Math.max(item.total, 1)} /><p>{item.note}</p></div>)}</div>
        </section>
      </div>
      <div className={styles.bottomColumns}>
        <section className={styles.panel} aria-labelledby="attention-title"><div className={styles.panelHeader}><div><p className={styles.eyebrow}>A LITTLE ATTENTION</p><h2 id="attention-title">Keep your catalog looking its best</h2></div></div><div className={styles.attention}>
          <div><span className={styles.attentionCount}>{data.products.missing_images}</span><div><strong>Products without images</strong><p>Add clear product photography.</p></div></div>
          <div><span className={styles.attentionCount}>{data.products.total - data.products.active}</span><div><strong>Inactive products</strong><p>Review details before making them active.</p></div></div>
          <Link href="/management/admin/brands">Review your catalog {arrow}</Link>
        </div></section>
        <section className={styles.themePanel}><div><span className={styles.themeLabel}>MAKE IT YOURS</span><h2>Your storefront.<br />Your signature.</h2><p>Preview your homepage and manage its appearance. Your Default theme is currently active.</p><Link href="/management/admin/themes">Explore themes {arrow}</Link></div><div className={styles.miniWindow} aria-hidden="true"><div /><span /><section><i /><i /><i /></section><b /><b /></div></section>
      </div>
      <footer className={styles.footer}><span className={styles.dot} />Catalog snapshot &middot; Refreshes every 30 seconds while this tab is active.</footer>
    </>}
  </section>;
}
