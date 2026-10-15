import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/media/media-image";
import { catalogParams, formatPrice, type CatalogFilters } from "@/lib/products";
import { CatalogUnavailable, loadProducts } from "@/lib/products-server";
import styles from "./catalog.module.css";

export const metadata = { title: "Products | SKY Mobile & Electronics", description: "Browse products and current prices from SKY Mobile & Electronics.", robots: { index: false, follow: true } };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const filters: CatalogFilters = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string"));
  const params = catalogParams(filters);
  const normalized = Object.fromEntries(params);
  let data;
  try { data = await loadProducts(normalized); }
  catch (error) {
    if (!(error instanceof CatalogUnavailable)) throw error;
    return <main className={styles.shell}><Link href="/">SKY home</Link><h1>Products</h1><p role="alert">The catalog is temporarily unavailable. Please try again shortly.</p><Link href="/products">Try again</Link></main>;
  }
  if (!data) notFound();
  const page = Number(params.get("page") || 1);
  function pageUrl(value: number) { const query = new URLSearchParams(params); query.set("page", String(value)); return `/products?${query}`; }
  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Catalog navigation"><Link href="/">SKY home</Link><Link href="/products">All products</Link></nav>
    <h1>Explore SKY products</h1>
    <form action="/products" className={styles.filters} role="search">
      <label>Search products<input name="search" maxLength={120} defaultValue={params.get("search") || ""} placeholder="Product or description" /></label>
      {params.get("category") && <input type="hidden" name="category" value={params.get("category")!} />}
      {params.get("brand") && <input type="hidden" name="brand" value={params.get("brand")!} />}
      <label>Sort by<select name="ordering" defaultValue={params.get("ordering") || "name"}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option></select></label>
      <button type="submit">Apply filters</button><Link href="/products">Clear</Link>
    </form>
    <p>{data.count} {data.count === 1 ? "product" : "products"} found</p>
    {!data.results.length && <p>No products match your filters. Try another search.</p>}
    <div className={styles.grid}>{data.results.map(product => <article key={product.id} className={styles.card}>
      <MediaImage src={product.image_url} alt={product.name} width={320} height={240} />
      <p><Link href={`/products?${new URLSearchParams({ brand: product.brand.slug })}`}>{product.brand.name}</Link> · <Link href={`/products?${new URLSearchParams({ category: product.category.slug })}`}>{product.category.name}</Link></p>
      <h2><Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h2>
      <p className={styles.price}>{formatPrice(product.price)}</p>
      {product.compare_at_price && <p>Comparison price: <del>{formatPrice(product.compare_at_price)}</del></p>}
    </article>)}</div>
    <nav className={styles.pagination} aria-label="Product pages">{data.previous && <Link href={pageUrl(page - 1)}>Previous page</Link>}<span>Page {page}</span>{data.next && <Link href={pageUrl(page + 1)}>Next page</Link>}</nav>
  </main>;
}
